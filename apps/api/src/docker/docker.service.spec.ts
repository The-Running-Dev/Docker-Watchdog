import { describe, expect, it } from 'vitest';
import { container } from '../../test/helpers.js';
import { groupByProject, parseHealth, splitImage, toDockerContainer } from './docker.service.js';

describe('splitImage', () => {
  it.each([
    ['nginx', { image: 'nginx' }],
    ['nginx:1.27', { image: 'nginx', version: '1.27' }],
    ['ghcr.io:443/org/app:2', { image: 'ghcr.io:443/org/app', version: '2' }],
    ['localhost:5000/app', { image: 'localhost:5000/app' }],
    ['app:1@sha256:abc', { image: 'app', version: '1' }],
    ['sha256:abc', { image: 'sha256:abc' }],
  ])('%s', (reference, expected) => expect(splitImage(reference)).toEqual(expected));
});

describe('parseHealth', () => {
  it.each([
    ['Up 5 minutes (healthy)', 'healthy'],
    ['Up 5 minutes (unhealthy)', 'unhealthy'],
    ['Up 2 seconds (health: starting)', 'starting'],
    ['Exited (0) 1 hour ago', undefined],
  ])('%s', (status, expected) => expect(parseHealth(status)).toBe(expected));
});

describe('toDockerContainer', () => {
  it('maps the engine listing', () => {
    const mapped = toDockerContainer({
      Id: 'abc',
      Names: ['/plex'],
      Image: 'plexinc/pms-docker:latest',
      Created: 0,
      Status: 'Up 1 hour (healthy)',
      State: 'running',
      Labels: {
        'com.docker.compose.project': 'media',
        'com.docker.compose.service': 'plex',
        'com.docker.compose.project.config_files': '/srv/media/compose.yaml',
      },
    } as never);

    expect(mapped).toMatchObject({
      Name: 'plex',
      Image: 'plexinc/pms-docker',
      Version: 'latest',
      CreatedAt: '1970-01-01T00:00:00.000Z',
      Health: 'healthy',
      Project: 'media',
      Service: 'plex',
      ConfigFiles: '/srv/media/compose.yaml',
    });
  });
});

describe('groupByProject', () => {
  it('sorts projects and their containers, standalone first', () => {
    const groups = groupByProject([
      container('b', { project: 'p', service: 'b' }),
      container('solo'),
      container('a', { project: 'p', service: 'a' }),
    ]);

    expect(groups.map((g) => [g.Project, g.Containers.map((c) => c.Name)])).toEqual([
      ['', ['solo']],
      ['p', ['a', 'b']],
    ]);
  });
});
