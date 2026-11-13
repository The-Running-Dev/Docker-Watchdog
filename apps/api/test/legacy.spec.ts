import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { container, createTestApp, tempTree, type TestApp } from './helpers.js';

const tree = tempTree({ 'web/compose.yaml': '' });

const kuma = (monitor: object, heartbeat: object = { status: 0 }) => ({ monitor, heartbeat });

describe('Legacy routes', () => {
  let t: TestApp;
  const server = () => t.app.getHttpServer();

  beforeAll(async () => {
    t = await createTestApp({ ProjectsDirectory: tree.root });
  });

  afterAll(async () => {
    await t.app.close();
    tree.dispose();
  });

  beforeEach(() => {
    t.runner.calls.length = 0;
    t.docker.containers = [container('plex', { project: 'media', service: 'plex' })];
  });

  describe('POST /restart (Uptime Kuma)', () => {
    it('answers the Flask bodies for bad payloads', async () => {
      await request(server()).post('/restart').send({}).expect(400, { error: 'No JSON Received' });
      await request(server()).post('/restart').send({ msg: 'test' }).expect(200, { status: 'healthy' });
      await request(server())
        .post('/restart')
        .send({ heartbeat: {} })
        .expect(400, { error: "No 'monitor' Object in Payload" });
      await request(server())
        .post('/restart')
        .send({ monitor: {} })
        .expect(400, { error: "No 'heartbeat' Object in Payload" });
      await request(server()).post('/restart').send(kuma({})).expect(400, { error: 'No Container Name Found' });
    });

    it('ignores monitors that are not down', async () => {
      await request(server())
        .post('/restart')
        .send(kuma({ name: 'plex' }, { status: 1 }))
        .expect(200, { message: 'Ignored plex, Status: 1' });
      expect(t.runner.calls).toEqual([]);
    });

    it('restarts the container named in the description, with docker restart', async () => {
      await request(server())
        .post('/restart')
        .send(kuma({ name: 'Plex', description: 'container-plex' }))
        .expect(200, { status: 'plex Restarted' });
      expect(t.runner.calls.map((c) => c.args)).toEqual([['restart', 'plex']]);
    });

    it('answers 404 and 500 like Flask', async () => {
      await request(server())
        .post('/restart')
        .send(kuma({ name: 'ghost' }))
        .expect(404, {
          error: 'container_not_found',
          details: "Container 'ghost' Not Found",
          container: 'ghost',
        });

      t.runner.failNext('Error response from daemon: boom');

      await request(server())
        .post('/restart')
        .send(kuma({ name: 'plex' }))
        .expect(500, { error: 'failed', details: 'Error response from daemon: boom', container: 'plex' });
    });
  });

  describe('POST /restart-project', () => {
    const body = (data: object) => ({ event: 'update-project', data });

    it('answers the Flask validation messages', async () => {
      const invalid = "Invalid Payload: Missing 'event' or 'data' Field.";

      await request(server()).post('/restart-project').send({}).expect(400, { error: invalid });
      await request(server())
        .post('/restart-project')
        .send({ event: 'other', data: { projectId: 'web' } })
        .expect(400, { error: invalid });
      await request(server())
        .post('/restart-project')
        .send(body({}))
        .expect(400, { error: "No 'projectId' Provided in Payload." });
      await request(server())
        .post('/restart-project')
        .send(body({ projectId: 'web', additionalArgs: ['rm'] }))
        .expect(400, { error: "Invalid 'additionalArgs': Expected a List of Options for 'docker compose up'." });
    });

    it('answers 404 for an unknown project', async () => {
      const res = await request(server())
        .post('/restart-project')
        .send(body({ projectId: 'nope' }))
        .expect(404);

      expect(res.body).toEqual({
        error: 'project_not_found',
        details: `No Compose File Found for Project 'nope' in ${tree.root}`,
      });
    });

    it('test mode runs nothing', async () => {
      const res = await request(server())
        .post('/restart-project')
        .send(body({ projectId: 'web', isTest: true, additionalArgs: '--build' }))
        .expect(200);

      expect(res.body.status).toMatch(
        /^Test Mode: Would Restart Project 'web' in .+ \(additionalArgs=\["--build"\]\)$/,
      );
      expect(t.runner.calls).toEqual([]);
    });

    it('pulls then runs up with only the payload args', async () => {
      await request(server())
        .post('/restart-project')
        .send(body({ projectId: 'web', additionalArgs: ['--remove-orphans'] }))
        .expect(200, { status: "Project 'web' Restarted Successfully.", additionalArgs: ['--remove-orphans'] });

      expect(t.runner.calls.map((c) => c.args)).toEqual([
        ['compose', 'pull'],
        ['compose', 'up', '-d', '--remove-orphans'],
      ]);
    });

    it('names the failed step', async () => {
      t.runner.failNext('no pull');

      await request(server())
        .post('/restart-project')
        .send(body({ projectId: 'web' }))
        .expect(500, { error: 'Docker Compose Pull Failed', details: 'no pull' });

      t.runner.failNext('', 0).failNext('no up');

      await request(server())
        .post('/restart-project')
        .send(body({ projectId: 'web' }))
        .expect(500, { error: 'Docker Compose Up Failed', details: 'no up' });
    });
  });
});
