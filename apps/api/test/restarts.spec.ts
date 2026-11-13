import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { container, createTestApp, tempTree, type TestApp } from './helpers.js';

const tree = tempTree({
  'stacks/web/compose.yaml': '',
  'stacks/web/compose.override.yaml': '',
  'apps/media/docker-compose.yml.bak': '',
  'apps/media/docker-compose.prod.yml': '',
  'apps/media/docker-compose.base.yml': '',
});

describe('Projects, containers and the webhook', () => {
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
    t.docker.containers = [
      container('web-app-1', { project: 'web', service: 'app' }),
      container('media-api', { project: 'other', service: 'api', workingDir: '/srv/apps/media/' }),
      container('loose'),
    ];
  });

  it('GET /api/projects groups live containers by project', async () => {
    const res = await request(server()).get('/api/projects').expect(200);

    expect(res.body.map((p: { Project: string }) => p.Project)).toEqual(['', 'other', 'web']);
  });

  it('a dry run returns the commands and runs nothing', async () => {
    const res = await request(server())
      .post('/api/projects/web/restart')
      .send({ hardReset: true, deleteVolumes: true, dryRun: true })
      .expect(200);

    expect(t.runner.calls).toEqual([]);
    expect(res.body).toMatchObject({ success: true, dryRun: true, kind: 'project', target: 'web' });
    expect(res.body.commands).toEqual([
      'docker compose pull',
      'docker compose down --remove-orphans --volumes',
      'docker compose up -d --force-recreate --remove-orphans --always-recreate-deps',
    ]);
  });

  it('restarts a project with pull then up, in its directory, with the configured up args', async () => {
    await request(server()).post('/api/projects/media/restart').send({}).expect(200);

    const files = ['--file', 'docker-compose.base.yml', '--file', 'docker-compose.prod.yml'];

    expect(t.runner.calls.map((c) => c.args)).toEqual([
      ['compose', ...files, 'pull'],
      ['compose', ...files, 'up', '-d', '--always-recreate-deps', '--remove-orphans'],
    ]);
    expect(t.runner.calls[0]?.cwd?.replaceAll('\\', '/')).toMatch(/apps\/media$/);
  });

  it('stops at the first failing step and answers 500 with the details', async () => {
    t.runner.failNext('pull access denied');

    const res = await request(server()).post('/api/projects/web/restart').send({}).expect(500);

    expect(t.runner.calls).toHaveLength(1);
    expect(res.body).toMatchObject({ success: false, failedStep: 'pull', details: 'pull access denied' });
  });

  it('refuses volume deletion without a hard reset, and non-option args', async () => {
    await request(server()).post('/api/projects/web/restart').send({ deleteVolumes: true }).expect(400);
    await request(server())
      .post('/api/projects/web/restart')
      .send({ additionalArgs: ['; rm -rf /'] })
      .expect(400);
    expect(t.runner.calls).toEqual([]);
  });

  it('answers 404 for unknown projects and names that leave the projects directory', async () => {
    await request(server()).post('/api/projects/nope/restart').send({}).expect(404);
    await request(server()).post('/api/projects/..%2F..%2Fetc/restart').send({}).expect(404);
  });

  it('recreates a compose container from its project', async () => {
    await request(server()).post('/api/containers/web-app-1/restart').send({ pull: true }).expect(200);

    expect(t.runner.calls.map((c) => c.args)).toEqual([
      ['compose', 'pull', 'app'],
      ['compose', 'up', '-d', '--no-deps', '--force-recreate', 'app'],
    ]);
  });

  it('finds the project by its working directory when the project name differs', async () => {
    await request(server()).post('/api/containers/media-api/restart').send({}).expect(200);

    expect(t.runner.calls[0]?.args).toContain('docker-compose.prod.yml');
  });

  it('restarts standalone containers, or when asked to, with docker restart', async () => {
    await request(server()).post('/api/containers/loose/restart').send({}).expect(200);
    await request(server()).post('/api/containers/web-app-1/restart').send({ mode: 'restart' }).expect(200);

    expect(t.runner.calls.map((c) => c.args)).toEqual([
      ['restart', 'loose'],
      ['restart', 'web-app-1'],
    ]);
  });

  it('answers 404 for an unknown container', async () => {
    await request(server()).post('/api/containers/ghost/restart').send({}).expect(404);
  });

  it('webhook: validates the payload', async () => {
    const res = await request(server()).post('/api/webhook').send({ event: 'nope' }).expect(400);

    expect(res.body.message).toEqual(expect.arrayContaining([expect.stringMatching(/^event:/)]));
    await request(server())
      .post('/api/webhook')
      .send({ event: 'update-project', data: { projectOrContainerId: 'web', deleteVolumes: true } })
      .expect(400);
  });

  it('webhook: a test project update is a dry run', async () => {
    const res = await request(server())
      .post('/api/webhook')
      .send({ event: 'update-project', data: { projectOrContainerId: 'web', hardReset: true, isTest: true } })
      .expect(200);

    expect(t.runner.calls).toEqual([]);
    expect(res.body).toMatchObject({ success: true, projectOrContainerId: 'web' });
    expect(res.body.details).toContain('docker compose down --remove-orphans');
    expect(res.body.details).not.toContain('--volumes');
  });

  it('webhook: updates a container by pulling and recreating it', async () => {
    await request(server())
      .post('/api/webhook')
      .send({ event: 'update-container', data: { projectOrContainerId: 'web-app-1' } })
      .expect(200);

    expect(t.runner.calls.map((c) => c.args[1])).toEqual(['pull', 'up']);
  });

  it('webhook: 404 and 500 carry a WebhookResponse', async () => {
    const missing = await request(server())
      .post('/api/webhook')
      .send({ event: 'update-project', data: { projectOrContainerId: 'nope' } })
      .expect(404);

    expect(missing.body).toMatchObject({ success: false, projectOrContainerId: 'nope' });

    t.runner.failNext('boom');

    const failed = await request(server())
      .post('/api/webhook')
      .send({ event: 'update-project', data: { projectOrContainerId: 'web' } })
      .expect(500);

    expect(failed.body).toMatchObject({ success: false, details: 'boom', projectOrContainerId: 'web' });
  });
});
