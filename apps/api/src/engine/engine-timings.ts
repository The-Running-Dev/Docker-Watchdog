/** Waits used by the updater and the monitor; tests shorten them. */
export interface EngineTimings {
  /** After `compose up`, before checking health. */
  settleMs: number;
  /** How long the updater waits for a restarted project to become healthy. */
  updateHealthTimeoutMs: number;
  /** How long the monitor waits for a restarted container before restarting its dependents. */
  monitorHealthTimeoutMs: number;
  /** Between health checks. */
  healthPollMs: number;
  /** How long the monitor waits for an update to finish before skipping an unhealthy container. */
  lockWaitMs: number;
  lockPollMs: number;
}

export const ENGINE_TIMINGS = 'ENGINE_TIMINGS';

/** The legacy watchdog's waits. */
export const DEFAULT_ENGINE_TIMINGS: EngineTimings = {
  settleMs: 10_000,
  updateHealthTimeoutMs: 120_000,
  monitorHealthTimeoutMs: 60_000,
  healthPollMs: 10_000,
  lockWaitMs: 20 * 60_000,
  lockPollMs: 30_000,
};

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
