import { render } from '@testing-library/react';
import type { Containers, DockerContainer, UpdaterStatus } from '@subzerodev/watchdog-shared';
import { createMemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { App } from './App';
import { routes } from './routes';
import { useAuthStore } from './store/auth';
import { useLiveStore } from './store/live';
import { useToastStore } from './store/toasts';
import { fakeSocket } from './test-socket';

/** An answer: a JSON body with status 200, or an explicit status and body. */
export type Reply = unknown | { status: number; body?: unknown };

export interface ApiCall {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: unknown;
}

/** Routes keyed "METHOD /path" (the query is ignored); a function sees the request body and headers. */
export type ApiRoutes = Record<string, Reply | ((body: unknown, headers: Record<string, string>) => Reply)>;

function isReply(value: unknown): value is { status: number; body?: unknown } {
  return typeof value === 'object' && value !== null && 'status' in value && typeof value.status === 'number';
}

/** Stubs fetch with the routes; unknown routes answer 404. Returns every call made. */
export function mockApi(routes: ApiRoutes): ApiCall[] {
  const calls: ApiCall[] = [];

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const method = init.method ?? 'GET';
      const path = input.split('?')[0] ?? input;
      const body: unknown = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
      const headers = (init.headers ?? {}) as Record<string, string>;

      calls.push({ method, path: input, headers, body });

      const route = routes[`${method} ${path}`];

      if (route === undefined) {
        return new Response(JSON.stringify({ statusCode: 404, message: 'Not Found' }), { status: 404 });
      }

      const reply: unknown = typeof route === 'function' ? route(body, headers) : route;

      const { status, body: payload } = isReply(reply) ? reply : { status: 200, body: reply };

      return new Response(payload === undefined ? '' : JSON.stringify(payload), { status });
    }),
  );

  return calls;
}

export { fakeSocket };

export function resetState(): void {
  try {
    localStorage.clear();
  } catch {
    // No storage in this environment.
  }

  useAuthStore.setState({ credential: null, status: null });
  useLiveStore.getState().reset();
  useToastStore.setState({ toasts: [] });
  fakeSocket.handlers.clear();
}

export function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  return { router, ...render(<App router={router} />) };
}

export const AUTH_OFF = { authEnabled: false, loginEnabled: false };

export const UPDATER: UpdaterStatus = {
  scheduled: true,
  schedule: '0 4 * * *',
  timeZone: 'UTC',
  running: false,
  nextRun: '2026-11-14T04:00:00.000Z',
  lastRun: null,
};

export function container(name: string, project?: string, extra: Partial<DockerContainer> = {}): DockerContainer {
  return {
    Id: `id-${name}`,
    Name: name,
    Image: 'nginx',
    Version: 'latest',
    Labels: {},
    CreatedAt: '2026-11-13T12:00:00.000Z',
    Status: 'Up 2 hours',
    State: 'running',
    ConfigFiles: '',
    ...(project ? { Project: project, Service: name } : {}),
    ...extra,
  };
}

export const PROJECTS: Containers[] = [
  { Project: 'media', Containers: [container('plex', 'media'), container('sonarr', 'media', { Health: 'unhealthy' })] },
  { Project: '', Containers: [container('portainer')] },
];
