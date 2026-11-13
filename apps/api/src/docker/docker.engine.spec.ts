import { EventEmitter } from 'node:events';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WatchdogEvents } from '../events.js';
import type { LogService } from '../logging/log.service.js';
import { DockerService, EventLines, unhealthyContainer } from './docker.service.js';

// One dockerode instance per DockerService; each test sets what its methods answer.
const engine = vi.hoisted(() => ({
  version: vi.fn(),
  listContainers: vi.fn(),
  getEvents: vi.fn(),
  getContainer: vi.fn(),
  getImage: vi.fn(),
}));

vi.mock('dockerode', () => ({
  default: class {
    constructor() {
      return engine;
    }
  },
}));

const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as unknown as LogService;

const image = (inspect: () => Promise<unknown>, distribution?: () => Promise<unknown>) => ({
  inspect: vi.fn(inspect),
  distribution: vi.fn(distribution ?? (() => Promise.reject(new Error('no registry')))),
});

describe('DockerService with a mocked engine', () => {
  let emitter: EventEmitter2;
  let service: DockerService;

  beforeEach(() => {
    vi.clearAllMocks();
    emitter = new EventEmitter2();
    service = new DockerService(log, emitter);
  });

  afterEach(() => service.onApplicationShutdown());

  it('reads the image reference and ID a container runs', async () => {
    engine.getContainer.mockReturnValue({
      inspect: async () => ({ Config: { Image: 'nginx:1.27' }, Image: 'sha256:abc' }),
    });

    await expect(service.containerImage('id')).resolves.toEqual({ reference: 'nginx:1.27', imageId: 'sha256:abc' });

    engine.getContainer.mockReturnValue({ inspect: () => Promise.reject(new Error('No such container')) });

    await expect(service.containerImage('gone')).resolves.toBeNull();
  });

  it('reads health, else state', async () => {
    const inspect = vi.fn();

    engine.getContainer.mockReturnValue({ inspect });
    inspect.mockResolvedValueOnce({ State: { Status: 'running', Health: { Status: 'unhealthy' } } });
    inspect.mockResolvedValueOnce({ State: { Status: 'exited' } });
    inspect.mockRejectedValueOnce(new Error('No such container'));

    expect(await service.containerHealth('a')).toBe('unhealthy');
    expect(await service.containerHealth('a')).toBe('exited');
    expect(await service.containerHealth('a')).toBeNull();
  });

  it('reads local image IDs', async () => {
    engine.getImage.mockReturnValueOnce(image(async () => ({ Id: 'sha256:new' })));
    engine.getImage.mockReturnValueOnce(image(() => Promise.reject(new Error('No such image'))));

    expect(await service.imageId('nginx:latest')).toBe('sha256:new');
    expect(await service.imageId('ghost:latest')).toBeNull();
  });

  it('compares the registry digest with the local repo digests', async () => {
    const local = async () => ({ RepoDigests: ['nginx@sha256:same'] });

    engine.getImage.mockReturnValue(image(local, async () => ({ Descriptor: { digest: 'sha256:same' } })));
    expect(await service.hasNewerImage('nginx:latest')).toBe(false);

    engine.getImage.mockReturnValue(image(local, async () => ({ Descriptor: { digest: 'sha256:other' } })));
    expect(await service.hasNewerImage('nginx:latest')).toBe(true);

    // Unknown either way: assume an update, like the legacy updater.
    engine.getImage.mockReturnValue(image(local));
    expect(await service.hasNewerImage('nginx:latest')).toBe(true);
  });

  it('turns unhealthy health events into ContainerUnhealthy, across chunks', async () => {
    const stream = new EventEmitter();
    const unhealthy = vi.fn();

    engine.getEvents.mockResolvedValue(stream);
    emitter.on(WatchdogEvents.ContainerUnhealthy, unhealthy);
    service.onApplicationBootstrap();
    await vi.waitFor(() => expect(stream.listenerCount('data')).toBe(1));

    const event = JSON.stringify({
      Type: 'container',
      Action: 'health_status: unhealthy',
      Actor: { Attributes: { name: 'plex' } },
    });

    stream.emit('data', Buffer.from(event.slice(0, 20)));
    expect(unhealthy).not.toHaveBeenCalled();

    stream.emit('data', Buffer.from(`${event.slice(20)}\n{"Type":"container","Action":"start"}\n`));
    expect(unhealthy).toHaveBeenCalledExactlyOnceWith('plex');
  });
});

describe('EventLines', () => {
  it('returns whole lines and keeps the rest', () => {
    const lines = new EventLines();

    expect(lines.push('{"a":1}\n{"b"')).toEqual([{ a: 1 }]);
    expect(lines.push(':2}\n\nnot json\n')).toEqual([{ b: 2 }]);
    expect(lines.push('')).toEqual([]);
  });
});

describe('unhealthyContainer', () => {
  it.each([
    [{ Type: 'container', Action: 'health_status: unhealthy', Actor: { Attributes: { name: 'a' } } }, 'a'],
    [{ Type: 'container', status: 'health_status: unhealthy', Actor: { Attributes: { name: 'b' } } }, 'b'],
    [{ Type: 'container', Action: 'health_status: healthy', Actor: { Attributes: { name: 'c' } } }, null],
    [{ Type: 'image', Action: 'health_status: unhealthy', Actor: { Attributes: { name: 'd' } } }, null],
    [{ Type: 'container', Action: 'health_status: unhealthy' }, null],
  ])('%j', (event, expected) => expect(unhealthyContainer(event)).toBe(expected));
});
