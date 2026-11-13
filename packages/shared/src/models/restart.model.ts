/** What asked for a restart; notifications and the UI use it to describe the restart. */
export type RestartSource = 'api' | 'webhook' | 'uptime-kuma' | 'restart-project' | 'monitor' | 'updater';

export type RestartTargetKind = 'project' | 'container';

export interface RestartResult {
  success: boolean;
  kind: RestartTargetKind;
  /** Project or container name. */
  target: string;
  /** True when the commands were only listed, not run. */
  dryRun: boolean;
  message: string;
  /** The docker commands that ran (or would run, for a dry run), in order. */
  commands: string[];
  /** The step that failed: down, pull, up or restart. */
  failedStep?: string;
  /** Error output of the failed step. */
  details?: string;
}

/** Emitted for every restart, whatever its source. */
export interface RestartEvent extends RestartResult {
  source: RestartSource;
  timestamp: string;
  /** The Uptime Kuma monitor that asked for the restart. */
  monitor?: { name: string; url?: string };
  /** Time zone to show times in, as sent by Uptime Kuma. */
  timeZone?: string;
}
