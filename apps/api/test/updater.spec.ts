import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UpdateRun } from '@subzerodev/watchdog-shared';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SweepLock } from '../src/engine/sweep-lock.js';
import { UpdaterService } from '../src/engine/updater.service.js';
import { WatchdogEvents } from '../src/events.js';
import { container, createTestApp, OLD_IMAGE, tempTree, type TestApp } from './helpers.js';

const WEBHOOK = 'https://discord.com/api/webhooks/1/test';

const tree = tempTree({ 'web/compose.yaml': '', 'media/compose.yaml': '', 'db/compose.yaml': '' });

describe('Updater', () => {
  let t: TestApp;
  let updater: UpdaterService;
  let runs: UpdateRun[];
  /** Image IDs a pull leaves behind, by reference; anything else pulls the image already running. */
  let pulled: Record<string, string>;
  const defaults = { IncludeProjects: [], ExcludeProjects: [], UpdaterTest: false, PruneAfterUpdate: true };
  const fetch = vi.fn<typeof globalThis.fetch>();
  const server = () => t.app.getHttpServer();
  const commands = () => t.runner.calls.map((c) => c.args.join(' '));
  const composeUps = () =>
    t.runner.calls.filter((c) => c.args.includes('up')).map((c) => c.cwd?.replace(/.*[\\/]/, ''));

  beforeAll(async () => {
    t = await createTestApp({ ProjectsDirectory: tree.root, DiscordWebhookUrl: WEBHOOK });
    updater = t.app.get(UpdaterService);
    t.app.get(EventEmitter2).on(WatchdogEvents.UpdateFinished, (run: UpdateRun) => runs.push(run));
  });

  afterAll(async () => {
    await t.app.close();
    tree.dispose();
  });

  beforeEach(() => {
    Object.assign(t.config, defaults);
    vi.stubGlobal('fetch', fetch);
    fetch.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
    runs = [];
    pulled = {};
    t.runner.calls.length = 0;
    t.runner.onRun = ({ args }) => {
      if (args[0] === 'pull') t.docker.images[args[1]!] = pulled[args[1]!] ?? OLD_IMAGE;
    };
    t.docker.images = {};
    t.docker.health = {};
    t.docker.newerInRegistry.clear();
    t.docker.containers = [
      container('web-app', { project: 'web', service: 'app' }, 'ghcr.io/org/web:1'),
      container('web-worker', { project: 'web', service: 'worker' }, 'ghcr.io/org/web:1'),
      container('plex', { project: 'media', service: 'plex' }, 'plexinc/pms-docker:latest'),
      container('postgres', { project: 'db', service: 'db' }, 'postgres:17'),
      container('standalone', undefined, 'busybox:latest'),
    ];
  });

  afterEach(() => vi.unstubAllGlobals());

  it('pulls each image once, recreates the projects whose image changed, then prunes', async () => {
    pulled = { 'ghcr.io/org/web:1': 'sha256:new' };

    const run = (await updater.run('api'))!;

    // Projects in name order: db, media, web (two containers, one image).
    expect(commands().filter((c) => c.startsWith('pull'))).toEqual([
      'pull postgres:17',
      'pull plexinc/pms-docker:latest',
      'pull ghcr.io/org/web:1',
    ]);
    expect(composeUps()).toEqual(['web']);
    expect(commands().at(-1)).toBe('image prune --all --force');
    expect(run).toMatchObject({
      trigger: 'api',
      dryRun: false,
      checked: 3,
      skipped: 0,
      updated: [{ project: 'web', images: ['ghcr.io/org/web:1'], success: true, unhealthy: [] }],
      summary: ' - web: ✅ All Services Healthy.',
    });
    expect(runs).toEqual([run]);
    expect(updater.status()).toMatchObject({ running: false, lastRun: run });
  });

  it('reports the services that do not become healthy', async () => {
    pulled = { 'ghcr.io/org/web:1': 'sha256:new', 'postgres:17': 'sha256:new' };
    t.docker.health = { 'web-worker': 'unhealthy' };

    const run = (await updater.run('schedule'))!;

    expect(run.summary).toBe(' - db: ✅ All Services Healthy.\n - web: ⚠️ Services Unhealthy:\n  - web-worker.');
    expect(run.updated[1]).toMatchObject({ success: false, unhealthy: ['web-worker'] });
  });

  it('does nothing more when no image changed, or a pull fails', async () => {
    t.runner.onRun = ({ args }) =>
      args[0] === 'pull' ? { code: 1, stdout: '', stderr: 'manifest unknown' } : undefined;

    const run = (await updater.run('api'))!;

    expect(composeUps()).toEqual([]);
    expect(commands()).not.toContain('image prune --all --force');
    expect(run).toMatchObject({ checked: 3, updated: [], summary: '' });
    expect(run.error).toBeUndefined();
  });

  it('honours IncludeProjects, then ExcludeProjects, ignoring case', async () => {
    pulled = { 'ghcr.io/org/web:1': 'sha256:new', 'postgres:17': 'sha256:new' };

    Object.assign(t.config, { IncludeProjects: ['WEB'], ExcludeProjects: ['web'] });
    expect(await updater.run('api')).toMatchObject({ checked: 1, skipped: 2, updated: [{ project: 'web' }] });

    Object.assign(t.config, { IncludeProjects: [], ExcludeProjects: ['Web', 'media'] });
    expect(await updater.run('api')).toMatchObject({ checked: 1, skipped: 2, updated: [{ project: 'db' }] });
  });

  it('skips digest-pinned images', async () => {
    t.docker.containers = [container('pinned', { project: 'db', service: 'db' }, 'postgres:17@sha256:abc')];
    t.docker.containerImage = async () => ({ reference: 'postgres:17@sha256:abc', imageId: OLD_IMAGE });

    expect(await updater.run('api')).toMatchObject({ checked: 1, updated: [] });
    expect(commands().filter((c) => c.startsWith('pull'))).toEqual([]);

    // FakeDocker is shared by the whole file.
    delete (t.docker as Partial<typeof t.docker>).containerImage;
  });

  it('a dry run asks the registry and runs no pull, compose or prune', async () => {
    t.docker.newerInRegistry.add('postgres:17');
    t.docker.images = { 'plexinc/pms-docker:latest': 'sha256:pulled-earlier' };

    const run = (await updater.run('api', { dryRun: true }))!;

    expect(commands()).toEqual(['compose version']);
    expect(run).toMatchObject({ dryRun: true, checked: 3 });
    expect(run.summary).toBe(' - db: 🧪 Update Available (Dry Run).\n - media: 🧪 Update Available (Dry Run).');
  });

  it('UpdaterTest makes every run a dry run unless asked otherwise', async () => {
    t.config.UpdaterTest = true;

    expect((await updater.run('schedule'))!.dryRun).toBe(true);
    expect((await updater.run('api', { dryRun: false }))!.dryRun).toBe(false);
  });

  it('stops when preflight fails', async () => {
    t.docker.engineVersion = null;

    const run = (await updater.run('startup'))!;

    t.docker.engineVersion = '29.0.0';

    expect(run).toMatchObject({ error: 'Preflight failed', checked: 0, summary: '' });
    expect(commands()).toEqual([]);
  });

  it('reports a failed restart and does not prune', async () => {
    pulled = { 'ghcr.io/org/web:1': 'sha256:new' };
    t.runner.onRun = ({ args }) => {
      if (args[0] === 'pull') t.docker.images[args[1]!] = pulled[args[1]!] ?? OLD_IMAGE;
      if (args.includes('up')) return { code: 1, stdout: '', stderr: 'port is already allocated' };
    };

    const run = (await updater.run('api'))!;

    expect(run.summary).toBe(' - web: ❌ Restart Failed (up).');
    expect(commands()).toContain('image prune --all --force');
  });

  it('reports projects whose compose files are gone', async () => {
    t.docker.containers = [container('ghost', { project: 'ghost', service: 'app' })];
    pulled = { 'nginx:latest': 'sha256:new' };

    expect((await updater.run('api'))!.summary).toBe(' - ghost: ⚠️ Compose Files Not Found.');
  });

  it('runs one update at a time', async () => {
    const lock = t.app.get(SweepLock);

    lock.tryAcquire('updater');

    expect(updater.run('api')).toBeNull();
    expect(updater.status().running).toBe(true);
    await request(server()).post('/api/updater/run').send({}).expect(409);

    lock.release();
  });

  it('GET /api/updater and POST /api/updater/run', async () => {
    await request(server())
      .get('/api/updater')
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({ scheduled: false, schedule: '0 4 * * *', timeZone: 'UTC', nextRun: null }),
      );
    await request(server()).post('/api/updater/run').send({ dryRun: 'yes' }).expect(400);
    await request(server()).post('/api/updater/run').send({ dryRun: true }).expect(202);

    await vi.waitFor(() => expect(runs).toHaveLength(1));
    expect(runs[0]).toMatchObject({ trigger: 'api', dryRun: true });
    expect(updater.status()).toMatchObject({ running: false, lastRun: runs[0] });
  });

  it('sends the summary to Discord, only when there is one', async () => {
    await updater.run('api');
    expect(fetch).not.toHaveBeenCalled();

    pulled = { 'postgres:17': 'sha256:new' };
    await updater.run('api');

    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());

    const [url, init] = fetch.mock.calls[0]!;

    expect(url).toBe(WEBHOOK);
    expect(JSON.parse(init!.body as string)).toMatchObject({
      embeds: [
        {
          title: 'Containers Update',
          description: ' - db: ✅ All Services Healthy.',
          footer: { text: 'Update Complete' },
        },
      ],
    });
  });

  it('SendUpdaterNotifications turns the summary off', async () => {
    t.config.SendUpdaterNotifications = false;
    pulled = { 'postgres:17': 'sha256:new' };

    await updater.run('api');
    await new Promise((resolve) => setTimeout(resolve, 20));

    t.config.SendUpdaterNotifications = true;
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('Updater schedule', () => {
  it('schedules the cron job and reports the next run', async () => {
    const t = await createTestApp({ UpdaterCronJob: true, CronSchedule: '30 3 * * *', TimeZone: 'Europe/Sofia' });

    try {
      const status = t.app.get(UpdaterService).status();

      expect(status).toMatchObject({ scheduled: true, schedule: '30 3 * * *', timeZone: 'Europe/Sofia' });
      expect(status.nextRun).toMatch(/T03:30:00\.000\+0[23]:00$/);
    } finally {
      await t.app.close();
    }
  });
});
