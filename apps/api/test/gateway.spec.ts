import type { AddressInfo } from 'node:net';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { afterEach, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { SocketEvents } from '../src/gateway/events.gateway.js';
import { WatchdogEvents } from '../src/events.js';
import { container, createTestApp, tempTree, type TestApp } from './helpers.js';

const KEY = 'socket-key';

async function listen(t: TestApp): Promise<string> {
  await t.app.listen(0, '127.0.0.1');

  return `http://127.0.0.1:${(t.app.getHttpServer().address() as AddressInfo).port}`;
}

function connect(url: string, auth: Record<string, string> = {}): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(url, { auth, transports: ['websocket'], reconnection: false });

    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (error) => {
      socket.close();
      reject(error);
    });
  });
}

describe('Events gateway', () => {
  let t: TestApp | undefined;
  let socket: Socket | undefined;

  afterEach(async () => {
    socket?.close();
    await t?.app.close();
    socket = t = undefined;
  });

  it('refuses a handshake without credentials when auth is on, and accepts the API key', async () => {
    t = await createTestApp({ ApiKey: KEY });
    const url = await listen(t);

    await expect(connect(url)).rejects.toThrow('Unauthorized');
    await expect(connect(url, { apiKey: 'wrong' })).rejects.toThrow('Unauthorized');

    socket = await connect(url, { apiKey: KEY });
    expect(socket.connected).toBe(true);
  });

  it('pushes restart results and container changes', async () => {
    const tree = tempTree({ 'web/compose.yaml': '' });

    try {
      t = await createTestApp({ ProjectsDirectory: tree.root });
      socket = await connect(await listen(t));

      const restart = new Promise((resolve) => socket!.once(SocketEvents.Restart, resolve));

      await request(t.app.getHttpServer()).post('/api/projects/web/restart').send({ dryRun: true }).expect(200);
      expect(await restart).toMatchObject({ kind: 'project', target: 'web', dryRun: true, source: 'api' });

      const changed = new Promise((resolve) => socket!.once(SocketEvents.Containers, resolve));

      t.app.get(EventEmitter2).emit(WatchdogEvents.ContainersChanged, [{ Project: 'x', Containers: [container('a')] }]);
      expect(await changed).toMatchObject([{ Project: 'x' }]);
    } finally {
      tree.dispose();
    }
  });
});
