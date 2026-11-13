import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp, type TestApp } from './helpers.js';

describe('App', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.app.close();
  });

  it('GET /health keeps the legacy contract', async () => {
    await request(t.app.getHttpServer()).get('/health').expect(200).expect({ status: 'healthy' });
  });

  it('GET /api/health is not a second health route', async () => {
    await request(t.app.getHttpServer()).get('/api/health').expect(404);
  });

  it('GET /api/info returns build, Docker and auth info', async () => {
    const res = await request(t.app.getHttpServer()).get('/api/info').expect(200);

    expect(res.body).toEqual({
      version: expect.any(String),
      buildDate: expect.any(String),
      insideDocker: expect.any(Boolean),
      dockerVersion: '29.0.0',
      authEnabled: false,
      loginEnabled: false,
    });
  });

  it('GET /info is only served under /api', async () => {
    await request(t.app.getHttpServer()).get('/info').expect(404);
  });

  it('GET /api/config masks secrets', async () => {
    await t.app.close();
    t = await createTestApp({ ApiKey: 'k', DiscordWebhookUrl: 'https://discord.com/api/webhooks/1/x' });

    const res = await request(t.app.getHttpServer()).get('/api/config').set('x-api-key', 'k').expect(200);

    expect(res.body).toMatchObject({ ApiKey: '********', DiscordWebhookUrl: '********', AdminPassword: '' });
  });

  it('GET /api/logs pages newest first', async () => {
    const res = await request(t.app.getHttpServer()).get('/api/logs?page=1&limit=5').set('x-api-key', 'k').expect(200);

    expect(res.body).toMatchObject({ page: 1, data: expect.any(Array) });
  });
});
