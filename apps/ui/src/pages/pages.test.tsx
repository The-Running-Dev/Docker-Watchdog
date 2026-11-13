import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { LogLevel, type LogEntry } from '@subzerodev/watchdog-shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { AUTH_OFF, fakeSocket, mockApi, PROJECTS, renderApp, resetState, UPDATER } from '../test-utils';

const BASE = { 'GET /api/auth/status': AUTH_OFF, 'GET /api/updater': UPDATER, 'GET /api/projects': PROJECTS };

const log = (level: LogLevel, message: string, minute: number): LogEntry => ({
  timestamp: `2026-11-13T12:${String(minute).padStart(2, '0')}:00.000Z`,
  level,
  message,
});

beforeEach(resetState);

describe('Projects page', () => {
  it('groups containers by project, standalone ones last', async () => {
    mockApi(BASE);

    renderApp('/projects');

    const table = await screen.findByRole('table', { name: 'Containers' });
    const text = table.textContent ?? '';

    expect(text.indexOf('media')).toBeLessThan(text.indexOf('Standalone containers'));
    expect(within(table).getByText('portainer')).toBeInTheDocument();
    expect(within(table).getByRole('button', { name: 'Restart project media' })).toBeInTheDocument();
  });

  it('filters the containers', async () => {
    mockApi(BASE);

    renderApp('/projects');
    fireEvent.change(await screen.findByLabelText('Filter'), { target: { value: 'sonarr' } });

    expect(screen.getByText('sonarr')).toBeInTheDocument();
    expect(screen.queryByText('plex')).not.toBeInTheDocument();
    expect(screen.queryByText('portainer')).not.toBeInTheDocument();
  });

  it('asks again before a restart deletes volumes', async () => {
    const calls = mockApi({
      ...BASE,
      'POST /api/projects/media/restart': {
        kind: 'project',
        target: 'media',
        success: true,
        dryRun: false,
        message: 'Restarted',
        commands: [],
      },
    });

    renderApp('/projects');
    fireEvent.click(await screen.findByRole('button', { name: 'Restart project media' }));

    const dialog = await screen.findByRole('dialog', { name: 'Restart media' });

    expect(within(dialog).getByLabelText('Delete volumes')).toBeDisabled();

    fireEvent.click(within(dialog).getByLabelText('Hard reset (down, then up)'));
    fireEvent.click(within(dialog).getByLabelText('Delete volumes'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Restart' }));

    const confirm = await screen.findByRole('dialog', { name: 'Delete the volumes of media?' });

    expect(calls.some((call) => call.method === 'POST')).toBe(false);

    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete volumes and restart' }));

    await waitFor(() =>
      expect(calls.find((call) => call.method === 'POST')).toMatchObject({
        path: '/api/projects/media/restart',
        body: { pull: true, hardReset: true, deleteVolumes: true, dryRun: false },
      }),
    );
    expect(await screen.findByText('Project media: restarted')).toBeInTheDocument();
  });

  it('drops deleteVolumes when the hard reset is unticked', async () => {
    const calls = mockApi({
      ...BASE,
      'POST /api/projects/media/restart': {
        kind: 'project',
        target: 'media',
        success: true,
        dryRun: true,
        message: 'ok',
        commands: ['docker compose down'],
      },
    });

    renderApp('/projects');
    fireEvent.click(await screen.findByRole('button', { name: 'Restart project media' }));

    const dialog = await screen.findByRole('dialog', { name: 'Restart media' });

    fireEvent.click(within(dialog).getByLabelText('Hard reset (down, then up)'));
    fireEvent.click(within(dialog).getByLabelText('Delete volumes'));
    fireEvent.click(within(dialog).getByLabelText('Hard reset (down, then up)'));
    fireEvent.click(within(dialog).getByLabelText('Dry run (list the commands only)'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dry run' }));

    await waitFor(() =>
      expect(calls.find((call) => call.method === 'POST')?.body).toEqual({
        pull: true,
        hardReset: false,
        deleteVolumes: false,
        dryRun: true,
      }),
    );
  });
});

describe('Logs page', () => {
  const page = {
    total: 3,
    page: 1,
    pageCount: 1,
    data: [
      log(LogLevel.Error, 'disk full', 3),
      log(LogLevel.Info, 'project started', 2),
      log(LogLevel.Debug, 'tick', 1),
    ],
  };

  it('filters by level and text', async () => {
    mockApi({ ...BASE, 'GET /api/logs': page });

    renderApp('/logs');

    expect(await screen.findByText('disk full')).toBeInTheDocument();
    expect(screen.getByText(/Showing 3 of 3 loaded entries/)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Info'));

    expect(screen.queryByText('project started')).not.toBeInTheDocument();
    expect(screen.getByText(/Showing 2 of 3 loaded entries/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'TICK' } });

    expect(screen.getByText('tick')).toBeInTheDocument();
    expect(screen.queryByText('disk full')).not.toBeInTheDocument();
  });

  it('shows entries pushed over the socket, newest first', async () => {
    mockApi({ ...BASE, 'GET /api/logs': page });

    renderApp('/logs');
    await screen.findByText('disk full');

    act(() => fakeSocket.emit('log-event', log(LogLevel.Warn, 'unhealthy: sonarr', 4)));

    const items = within(screen.getByRole('list', { name: 'Log entries' })).getAllByRole('listitem');

    expect(items[0]).toHaveTextContent('unhealthy: sonarr');
    expect(items).toHaveLength(4);
  });

  it('loads older pages on request', async () => {
    const calls = mockApi({
      ...BASE,
      'GET /api/logs': () =>
        calls.filter((call) => call.path.startsWith('/api/logs')).length === 1
          ? { ...page, total: 4, pageCount: 2 }
          : { total: 4, page: 2, pageCount: 2, data: [log(LogLevel.Info, 'oldest', 0)] },
    });

    renderApp('/logs');
    fireEvent.click(await screen.findByRole('button', { name: 'Load older logs' }));

    expect(await screen.findByText('oldest')).toBeInTheDocument();
    expect(calls.at(-1)?.path).toBe('/api/logs?page=2&limit=500');
    expect(screen.queryByRole('button', { name: 'Load older logs' })).not.toBeInTheDocument();
  });
});

describe('Settings page', () => {
  it('shows the version and the masked configuration', async () => {
    mockApi({
      ...BASE,
      'GET /api/info': {
        version: '2.0.0',
        buildDate: '',
        insideDocker: true,
        dockerVersion: '27.1',
        authEnabled: true,
      },
      'GET /api/config': { WATCHDOG_API_KEY: '****', DOCKER_HOST: 'unix:///var/run/docker.sock' },
    });

    renderApp('/settings');

    const about = await screen.findByRole('table', { name: 'About' });
    const config = await screen.findByRole('table', { name: 'Configuration' });

    expect(within(about).getByText('2.0.0')).toBeInTheDocument();
    expect(within(about).getByText('27.1')).toBeInTheDocument();

    const keys = within(config)
      .getAllByRole('rowheader')
      .map((cell) => cell.textContent);

    expect(keys).toEqual(['DOCKER_HOST', 'WATCHDOG_API_KEY']);
    expect(within(config).getByText('****')).toBeInTheDocument();
  });
});

describe('Webhook page', () => {
  it('sends a test request and shows the answer', async () => {
    const calls = mockApi({
      ...BASE,
      'POST /api/webhook': { success: true, message: 'Dry run for media', projectOrContainerId: 'media' },
    });

    renderApp('/webhook');
    fireEvent.change(await screen.findByLabelText(/^Project/), { target: { value: 'media' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('HTTP 200: Dry run for media')).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'POST')?.body).toMatchObject({
      event: 'update-project',
      data: { projectOrContainerId: 'media', isTest: true, deleteVolumes: false },
    });
    expect(JSON.parse(localStorage.getItem('watchdog-webhook-form') ?? '{}')).toMatchObject({
      data: { projectOrContainerId: 'media' },
    });
  });

  it('asks again before a real request deletes volumes', async () => {
    const calls = mockApi({
      ...BASE,
      'POST /api/webhook': { success: true, message: 'Restarted media', projectOrContainerId: 'media' },
    });

    renderApp('/webhook');
    fireEvent.change(await screen.findByLabelText(/^Project/), { target: { value: 'media' } });
    fireEvent.click(screen.getByLabelText('Hard reset (down, then up)'));
    fireEvent.click(screen.getByLabelText('Delete volumes'));
    fireEvent.click(screen.getByLabelText('Test mode (list the commands only)'));
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    const confirm = await screen.findByRole('dialog', { name: 'Delete the volumes of media?' });

    expect(calls.some((call) => call.method === 'POST')).toBe(false);

    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete volumes and restart' }));

    expect(await screen.findByText('HTTP 200: Restarted media')).toBeInTheDocument();
    expect(calls.find((call) => call.method === 'POST')?.body).toMatchObject({
      data: { hardReset: true, deleteVolumes: true, isTest: false },
    });
  });

  it('shows an error answer', async () => {
    mockApi({
      ...BASE,
      'POST /api/webhook': {
        status: 404,
        body: { success: false, message: 'No project ghost', projectOrContainerId: 'ghost' },
      },
    });

    renderApp('/webhook');
    fireEvent.change(await screen.findByLabelText(/^Project/), { target: { value: 'ghost' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('HTTP 404: No project ghost')).toBeInTheDocument();
  });
});
