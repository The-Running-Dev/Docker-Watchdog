import type { ContainerRestartOptions, ProjectRestartOptions, RestartResult } from '@subzerodev/watchdog-shared';
import { toast } from '../store/toasts';
import { api, ApiError } from './client';

function isRestartResult(body: unknown): body is RestartResult {
  return typeof body === 'object' && body !== null && 'success' in body && 'commands' in body;
}

/** Toasts the result: the commands for a dry run, the error output for a failure. */
export function toastResult(result: RestartResult): void {
  const what = result.kind === 'project' ? 'Project' : 'Container';
  const title = result.dryRun
    ? `${what} ${result.target}: dry run`
    : `${what} ${result.target}: ${result.success ? 'restarted' : 'restart failed'}`;
  const details = result.success ? (result.dryRun ? result.commands.join('\n') : undefined) : result.details;

  toast.result(result.success, { title, message: result.message, details });
}

/** Runs a restart and toasts how it went; a failed restart answers 500 with its result. */
async function restart(path: string, options: object): Promise<RestartResult | undefined> {
  try {
    const result = await api<RestartResult>(path, { body: options });

    toastResult(result);

    return result;
  } catch (error) {
    if (error instanceof ApiError && isRestartResult(error.body)) {
      toastResult(error.body);

      return error.body;
    }

    toast.show('error', {
      title: 'Restart failed',
      message: error instanceof Error ? error.message : String(error),
    });

    return undefined;
  }
}

export const restartProject = (name: string, options: Partial<ProjectRestartOptions>) =>
  restart(`/api/projects/${encodeURIComponent(name)}/restart`, options);

export const restartContainer = (name: string, options: Partial<ContainerRestartOptions>) =>
  restart(`/api/containers/${encodeURIComponent(name)}/restart`, options);
