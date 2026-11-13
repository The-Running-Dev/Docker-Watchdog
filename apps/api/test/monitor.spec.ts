import { EventEmitter2 } from '@nestjs/event-emitter';
import type { RestartEvent } from '@subzerodev/watchdog-shared';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SweepLock } from '../src/engine/sweep-lock.js';
import { WatchdogEvents } from '../src/events.js';
import { container, createTestApp, TEST_TIMINGS, type TestApp } from './helpers.js';

const WEBHOOK = 'https://discord.com/api/webhooks/1/test';

describe('Health monitor', () => {
  let t: TestApp;
  let emitter: EventEmitter2;
  let restarts: RestartEvent[];
  const fetch = vi.fn<typeof globalThis.fetch>();
  const unhealthy = (name: string) => emitter.emitAsync(WatchdogEvents.ContainerUnhealthy, name);
  const restarted = () => t.runner.calls.map((c) => c.args.join(' '));

  beforeAll(async () => {
    t = await createTestApp({
      DiscordWebhookUrl: WEBHOOK,
      ContainerDependencies: { vpn: ['torrents', 'news'] },
    });
    emitter = t.app.get(EventEmitter2);
    emitter.on(WatchdogEvents.Restart, (event: RestartEvent) => restarts.push(event));
  });

  afterAll(() => t.app.close());

  beforeEach(() => {
    vi.stubGlobal('fetch', fetch);
    fetch.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
    restarts = [];
    t.config.SendMonitorNotifications = true;
    t.runner.calls.length = 0;
    t.docker.health = {};
    t.docker.containers = ['plex', 'vpn', 'torrents', 'news'].map((name) => container(name));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('restarts an unhealthy container and tells Discord', async () => {
    await unhealthy('plex');

    expect(restarted()).toEqual(['restart plex']);
    expect(restarts).toMatchObject([{ target: 'plex', source: 'monitor', success: true }]);

    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(JSON.parse(fetch.mock.calls[0]![1]!.body as string)).toMatchObject({
      embeds: [{ title: '✅ plex Restarted! ✅', footer: { text: 'Auto Recovery' } }],
    });
  });

  it('restarts the dependents once the container is healthy again', async () => {
    await unhealthy('vpn');

    expect(restarted()).toEqual(['restart vpn', 'restart torrents', 'restart news']);
  });

  it('leaves the dependents alone when the container stays unhealthy', async () => {
    t.docker.health = { vpn: 'unhealthy' };

    const started = Date.now();

    await unhealthy('vpn');

    expect(restarted()).toEqual(['restart vpn']);
    expect(Date.now() - started).toBeGreaterThanOrEqual(TEST_TIMINGS.monitorHealthTimeoutMs - 10);
  });

  it('handles one event per container at a time', async () => {
    t.docker.health = { vpn: 'starting' };

    await Promise.all([unhealthy('vpn'), unhealthy('vpn'), unhealthy('plex')]);

    expect(restarted().sort()).toEqual(['restart plex', 'restart vpn']);
  });

  it('waits for a running update, then restarts', async () => {
    const lock = t.app.get(SweepLock);

    lock.tryAcquire('updater');
    setTimeout(() => lock.release(), 30);

    await unhealthy('plex');

    expect(restarted()).toEqual(['restart plex']);
  });

  it('skips the restart when the update outlasts the wait', async () => {
    const lock = t.app.get(SweepLock);

    lock.tryAcquire('updater');

    try {
      await unhealthy('plex');
    } finally {
      lock.release();
    }

    expect(restarted()).toEqual([]);
  });

  it('survives containers that are gone or fail to restart, and only announces successes', async () => {
    await unhealthy('ghost');
    t.runner.failNext('Error response from daemon: boom');
    await unhealthy('plex');

    expect(restarts).toMatchObject([{ target: 'plex', success: false }]);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('SendMonitorNotifications turns the message off', async () => {
    t.config.SendMonitorNotifications = false;

    await unhealthy('plex');
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(restarted()).toEqual(['restart plex']);
    expect(fetch).not.toHaveBeenCalled();
  });
});
