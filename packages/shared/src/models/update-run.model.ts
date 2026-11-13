/** What started an updater run. */
export type UpdateTrigger = 'schedule' | 'startup' | 'api';

/** One project the updater found a newer image for. */
export interface ProjectUpdate {
  project: string;
  /** Image references with a newer image. */
  images: string[];
  /** False when the restart failed or a container did not come back healthy. */
  success: boolean;
  /** Containers that were not healthy (or running) once the wait was over. */
  unhealthy: string[];
  message: string;
}

export interface UpdateRun {
  trigger: UpdateTrigger;
  /** True when images were only checked: nothing was pulled, restarted or pruned. */
  dryRun: boolean;
  startedAt: string;
  finishedAt: string;
  /** Projects with running containers that were checked. */
  checked: number;
  /** Projects left out by IncludeProjects / ExcludeProjects. */
  skipped: number;
  updated: ProjectUpdate[];
  /** One line per updated project, as sent to Discord. Empty when nothing changed. */
  summary: string;
  /** Set when the run could not start or stopped early. */
  error?: string;
}

export interface UpdaterStatus {
  /** True when the updater runs on its schedule. */
  scheduled: boolean;
  schedule: string;
  timeZone: string;
  running: boolean;
  /** ISO 8601, or null when the updater is not scheduled. */
  nextRun: string | null;
  lastRun: UpdateRun | null;
}
