import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LogService } from '../src/logging/log.service.js';
import { DiscordService } from '../src/notifications/discord.service.js';
import { container, createTestApp, tempTree, type TestApp } from './helpers.js';

const WEBHOOK = 'https://discord.com/api/webhooks/1/test';
const tree = tempTree({ 'media/compose.yaml': '' });
const kuma = (monitor: object) => ({ monitor, heartbeat: { status: 0, timezone: 'Europe/Sofia' } });

describe('Discord notifications', () => {
  let t: TestApp;
  const fetch = vi.fn<typeof globalThis.fetch>();
  const server = () => t.app.getHttpServer();
  const sent = () => fetch.mock.calls.map(([, init]) => JSON.parse(init!.body as string).embeds[0]);
  const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

  beforeAll(async () => {
    t = await createTestApp({ ProjectsDirectory: tree.root, DiscordWebhookUrl: WEBHOOK });
  });

  afterAll(async () => {
    await t.app.close();
    tree.dispose();
  });

  beforeEach(() => {
    vi.stubGlobal('fetch', fetch);
    fetch.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
    Object.assign(t.config, { DiscordWebhookUrl: WEBHOOK, SendAPINotifications: true });
    t.docker.containers = [container('plex', { project: 'media', service: 'plex' })];
  });

  afterEach(() => vi.unstubAllGlobals());

  it('announces Uptime Kuma restarts like the Flask API', async () => {
    await request(server())
      .post('/restart')
      .send(kuma({ name: 'Plex', url: 'https://plex.example', description: 'container-plex' }))
      .expect(200);

    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(fetch.mock.calls[0]![0]).toBe(WEBHOOK);
    expect(sent()).toEqual([
      expect.objectContaining({
        title: '✅ Plex Restarted! ✅',
        fields: [
          { name: 'Name', value: 'Plex', inline: false },
          { name: 'URL', value: 'https://plex.example', inline: false },
          { name: 'Time', value: expect.stringMatching(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/), inline: false },
        ],
        footer: { text: 'Uptime Kuma Auto Recovery' },
      }),
    ]);
  });

  it('stays quiet when turned off, for failed restarts and for other sources', async () => {
    t.config.SendAPINotifications = false;
    await request(server())
      .post('/restart')
      .send(kuma({ name: 'plex' }))
      .expect(200);

    t.config.SendAPINotifications = true;
    t.runner.failNext('boom');
    await request(server())
      .post('/restart')
      .send(kuma({ name: 'plex' }))
      .expect(500);

    await request(server()).post('/api/containers/plex/restart').send({}).expect(200);
    await settle();

    expect(fetch).not.toHaveBeenCalled();
  });

  it('logs and drops failed deliveries; sends nothing without a webhook', async () => {
    const warn = vi.spyOn(t.app.get(LogService), 'warn');
    const discord = t.app.get(DiscordService);
    const embed = { title: 'test', color: 0, timestamp: new Date(0).toISOString() };

    fetch.mockResolvedValueOnce(new Response('rate limited', { status: 429 }));
    expect(await discord.send(embed)).toBe(false);
    expect(warn).toHaveBeenCalledWith('Discord notification failed: 429 rate limited');

    fetch.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND'));
    expect(await discord.send(embed)).toBe(false);
    expect(warn).toHaveBeenCalledWith('Discord notification failed: getaddrinfo ENOTFOUND');

    expect(await discord.send(embed)).toBe(true);

    t.config.DiscordWebhookUrl = '';
    expect(await discord.send(embed)).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
