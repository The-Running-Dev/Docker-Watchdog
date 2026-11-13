import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from './store/auth';
import { AUTH_OFF, mockApi, PROJECTS, renderApp, resetState, UPDATER } from './test-utils';

const AUTH_ON = { authEnabled: true, loginEnabled: true };

const pages = {
  'GET /api/projects': PROJECTS,
  'GET /api/updater': UPDATER,
};

describe('App', () => {
  beforeEach(resetState);

  it('opens the projects page when sign-in is off', async () => {
    mockApi({ 'GET /api/auth/status': AUTH_OFF, ...pages });

    const { router } = renderApp('/');

    expect(await screen.findByText('plex')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/projects');
    expect(screen.getByRole('tab', { name: 'Projects' })).toHaveAttribute('aria-selected', 'true');
  });

  it('sends a signed-out user to the login page', async () => {
    mockApi({ 'GET /api/auth/status': AUTH_ON });

    const { router } = renderApp('/logs');

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('says so when a password is wrong', async () => {
    mockApi({
      'GET /api/auth/status': AUTH_ON,
      'POST /api/auth/login': { status: 401, body: { statusCode: 401, message: 'Unauthorized' } },
    });

    renderApp('/login');

    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Wrong username or password')).toBeInTheDocument();
  });

  it('signs in with a password and goes back to the page asked for', async () => {
    const calls = mockApi({
      'GET /api/auth/status': AUTH_ON,
      'POST /api/auth/login': { token: 'jwt', username: 'admin' },
      ...pages,
    });

    const { router } = renderApp('/projects');

    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('plex')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/projects');
    expect(calls.find((call) => call.path === '/api/auth/login')?.body).toEqual({
      username: 'admin',
      password: 'secret',
    });
    expect(calls.find((call) => call.path === '/api/projects')?.headers.Authorization).toBe('Bearer jwt');
  });

  it('signs in with the API key once the API accepts it', async () => {
    const calls = mockApi({
      'GET /api/auth/status': AUTH_ON,
      'GET /api/info': (_: unknown, headers: Record<string, string>) =>
        headers['x-api-key'] === 'good' ? { version: '1.0.0' } : { status: 401, body: { message: 'Unauthorized' } },
      ...pages,
    });

    renderApp('/projects');

    fireEvent.click(await screen.findByRole('button', { name: 'Use an API key instead' }));
    fireEvent.change(screen.getByLabelText('API key'), { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: 'Use API key' }));

    expect(await screen.findByText('The API key was not accepted')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('API key'), { target: { value: 'good' } });
    fireEvent.click(screen.getByRole('button', { name: 'Use API key' }));

    expect(await screen.findByText('plex')).toBeInTheDocument();
    expect(calls.find((call) => call.path === '/api/projects')?.headers['x-api-key']).toBe('good');
  });

  it('signs out when the API stops accepting the credential', async () => {
    mockApi({ 'GET /api/auth/status': AUTH_ON, 'GET /api/projects': { status: 401 }, 'GET /api/updater': UPDATER });
    useAuthStore.getState().signIn({ kind: 'apiKey', apiKey: 'revoked' });

    const { router } = renderApp('/projects');

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(useAuthStore.getState().credential).toBeNull();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('says so when the API cannot be reached, and retries', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    renderApp('/projects');

    expect(await screen.findByText('API unreachable')).toBeInTheDocument();

    mockApi({ 'GET /api/auth/status': AUTH_OFF, ...pages });
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.getByText('plex')).toBeInTheDocument());
  });
});
