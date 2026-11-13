import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

describe('App', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health keeps the legacy contract', async () => {
    await request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'healthy' });
  });

  it('GET /api/health is not a second health route', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(404);
  });

  it('GET /api/info returns build info', async () => {
    const res = await request(app.getHttpServer()).get('/api/info').expect(200);

    expect(res.body).toEqual({
      version: expect.any(String),
      buildDate: expect.any(String),
      insideDocker: expect.any(Boolean),
    });
  });

  it('GET /info is only served under /api', async () => {
    await request(app.getHttpServer()).get('/info').expect(404);
  });
});
