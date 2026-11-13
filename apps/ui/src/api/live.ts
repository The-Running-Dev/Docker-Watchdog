import type { Containers, LogEntry, RestartEvent, UpdateRun, UpdaterStatus } from '@subzerodev/watchdog-shared';
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore, type Credential } from '../store/auth';
import { useLiveStore } from '../store/live';
import { toast } from '../store/toasts';
import { api } from './client';

/** Socket.io event names, as the API's EventsGateway emits them. */
export const SocketEvents = {
  Log: 'log-event',
  Containers: 'containers-event',
  Restart: 'restart-event',
  Update: 'update-event',
} as const;

const SOURCE_LABELS: Record<RestartEvent['source'], string> = {
  api: 'API',
  webhook: 'Webhook',
  'uptime-kuma': 'Uptime Kuma',
  'restart-project': 'Restart-project hook',
  monitor: 'Health monitor',
  updater: 'Updater',
};

/** Toasts a restart this browser did not ask for; the UI toasts its own results itself. */
export function toastRestart(event: RestartEvent): void {
  if (event.source === 'api') return;

  const what = event.kind === 'project' ? 'Project' : 'Container';
  const title = `${what} ${event.target}: ${event.success ? 'restarted' : 'restart failed'}`;
  const details = [`By ${SOURCE_LABELS[event.source]}`, event.monitor ? `monitor ${event.monitor.name}` : '']
    .filter(Boolean)
    .join(', ');

  toast.result(event.success, { title, message: event.message, details });
}

export function toastUpdate(run: UpdateRun): void {
  const title = run.dryRun ? 'Update check' : 'Update';

  if (run.error) {
    toast.show('error', { title: `${title} failed`, message: run.error });
  } else if (run.updated.length > 0) {
    toast.result(
      run.updated.every((update) => update.success),
      { title: `${title}: ${run.updated.length} of ${run.checked} projects`, message: run.summary.trim() },
    );
  } else if (run.trigger === 'api') {
    toast.show('info', { title, message: `All ${run.checked} projects are up to date.` });
  }
}

/** Reloads the updater status into the store; errors leave the old one. */
export function refreshUpdater(): Promise<void> {
  return api<UpdaterStatus>('/api/updater')
    .then((status) => useLiveStore.getState().setUpdater(status))
    .catch(() => {});
}

/** Keeps the live store current over socket.io while the user is signed in (or auth is off). */
export function useLiveEvents(credential: Credential | null): void {
  useEffect(() => {
    const live = useLiveStore.getState();
    const auth = credential
      ? credential.kind === 'token'
        ? { token: credential.token }
        : { apiKey: credential.apiKey }
      : {};
    const socket = io({ auth });

    socket.on('connect', () => live.setConnected(true));
    socket.on('disconnect', () => live.setConnected(false));
    socket.on('connect_error', (error) => {
      live.setConnected(false);

      // A token that expired: back to the login page.
      if (error.message === 'Unauthorized' && credential) useAuthStore.getState().signOut();
    });
    socket.on(SocketEvents.Log, (entry: LogEntry) => live.addLogs([entry]));
    socket.on(SocketEvents.Containers, (projects: Containers[]) => live.setProjects(projects));
    socket.on(SocketEvents.Restart, (event: RestartEvent) => toastRestart(event));
    socket.on(SocketEvents.Update, (run: UpdateRun) => {
      toastUpdate(run);
      void refreshUpdater();
    });

    return () => {
      socket.disconnect();
      live.setConnected(false);
    };
  }, [credential]);
}
