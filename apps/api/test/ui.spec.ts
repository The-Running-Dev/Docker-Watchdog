import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolveUiPath, UI_EXCLUDE, UiModule } from '../src/ui/ui.module.js';
import { createTestApp, type TestApp } from './helpers.js';

const INDEX = '<!doctype html><title>Watchdog</title><div id="root"></div>';

describe('UI', () => {
  let dir: string;
  let t: TestApp;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'watchdog-ui-'));
    writeFileSync(join(dir, 'index.html'), INDEX);
    writeFileSync(join(dir, 'app.js'), 'console.log("ui")');
    t = await createTestApp({}, [UiModule.register(dir)]);
  });

  afterAll(async () => {
    await t.app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('serves index.html at /', async () => {
    const res = await request(t.app.getHttpServer()).get('/').expect(200);

    expect(res.text).toBe(INDEX);
  });

  it('serves index.html for client routes', async () => {
    const res = await request(t.app.getHttpServer()).get('/projects').expect(200);

    expect(res.text).toBe(INDEX);
  });

  it('serves built assets', async () => {
    const res = await request(t.app.getHttpServer()).get('/app.js').expect(200);

    expect(res.text).toBe('console.log("ui")');
  });

  it('leaves unknown API routes to the API', async () => {
    const res = await request(t.app.getHttpServer()).get('/api/unknown').expect(404);

    expect(res.body).toMatchObject({ statusCode: 404 });
  });

  it('keeps the API and the legacy health route', async () => {
    await request(t.app.getHttpServer()).get('/health').expect(200).expect({ status: 'healthy' });
    await request(t.app.getHttpServer()).get('/api/info').expect(200);
  });
});

describe('UI_EXCLUDE', () => {
  it.each(['/api', '/api/projects', '/socket.io/', '/health', '/restart', '/restart-project'])(
    'excludes %s',
    (path) => {
      expect(UI_EXCLUDE.test(path)).toBe(true);
    },
  );

  it.each(['/', '/projects', '/apis', '/healthy', '/logs'])('serves %s', (path) => {
    expect(UI_EXCLUDE.test(path)).toBe(false);
  });
});

describe('resolveUiPath', () => {
  it('is off when WATCHDOG_UI_PATH is empty', () => {
    expect(resolveUiPath({ WATCHDOG_UI_PATH: '' })).toBeUndefined();
  });

  it('uses WATCHDOG_UI_PATH when set', () => {
    expect(resolveUiPath({ WATCHDOG_UI_PATH: '/srv/ui' })).toBe(resolve('/srv/ui'));
  });

  it('defaults to the UI package build', () => {
    expect(resolveUiPath({})).toBe(resolve(import.meta.dirname, '..', '..', 'ui', 'dist'));
  });
});

describe('UiModule.register', () => {
  it('serves nothing when the UI is not built', () => {
    expect(UiModule.register(join(tmpdir(), 'watchdog-no-ui')).imports).toBeUndefined();
  });
});
