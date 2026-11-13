import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp, type TestApp } from './helpers.js';

const KEY = 'test-key';
const ADMIN = { AdminUser: 'admin', AdminPassword: 'test-password', JwtSecret: 'test-secret' };

describe('Auth', () => {
  let t: TestApp | undefined;

  afterEach(async () => {
    await t?.app.close();
    t = undefined;
  });

  it('is off by default: every route is open', async () => {
    t = await createTestApp();

    await request(t.app.getHttpServer()).get('/api/projects').expect(200);
    await request(t.app.getHttpServer())
      .get('/api/auth/status')
      .expect(200, { authEnabled: false, loginEnabled: false });
    await request(t.app.getHttpServer()).post('/api/auth/login').send({ username: 'a', password: 'b' }).expect(404);
  });

  it('with an API key, protects /api and the legacy routes', async () => {
    t = await createTestApp({ ApiKey: KEY });
    const server = t.app.getHttpServer();

    await request(server).get('/api/projects').expect(401);
    await request(server).get('/api/projects').set('x-api-key', 'wrong').expect(401);
    await request(server).get('/api/projects').set('x-api-key', KEY).expect(200);
    await request(server).post('/restart').send({}).expect(401);
    await request(server).post('/restart-project').send({}).expect(401);
    await request(server).post('/api/webhook').send({}).expect(401);
  });

  it('keeps /health and the auth status public', async () => {
    t = await createTestApp({ ApiKey: KEY });

    await request(t.app.getHttpServer()).get('/health').expect(200);
    await request(t.app.getHttpServer())
      .get('/api/auth/status')
      .expect(200, { authEnabled: true, loginEnabled: false });
  });

  it('logs in with the admin credentials and accepts the token', async () => {
    t = await createTestApp(ADMIN);
    const server = t.app.getHttpServer();

    const res = await request(server)
      .post('/api/auth/login')
      .send({ username: 'admin', password: ADMIN.AdminPassword })
      .expect(200);

    expect(res.body).toEqual({ username: 'admin', token: expect.any(String), expiresIn: '12h' });

    await request(server).get('/api/projects').set('authorization', `Bearer ${res.body.token}`).expect(200);
    await request(server).get('/api/projects').set('authorization', 'Bearer not-a-token').expect(401);
  });

  it('refuses a wrong password and an incomplete body', async () => {
    t = await createTestApp(ADMIN);
    const server = t.app.getHttpServer();

    await request(server).post('/api/auth/login').send({ username: 'admin', password: 'nope' }).expect(401);
    await request(server).post('/api/auth/login').send({ username: 'admin' }).expect(400);
  });

  it('does not accept a token signed with another secret', async () => {
    t = await createTestApp(ADMIN);
    const other = await createTestApp({ ...ADMIN, JwtSecret: 'another-secret' });

    const res = await request(other.app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: ADMIN.AdminPassword });

    await other.app.close();
    await request(t.app.getHttpServer())
      .get('/api/projects')
      .set('authorization', `Bearer ${res.body.token}`)
      .expect(401);
  });
});
