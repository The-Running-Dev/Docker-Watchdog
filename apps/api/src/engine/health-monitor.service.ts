import { HttpException, Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '../config/config.service.js';
import { ContainersService } from '../containers/containers.service.js';
import { WatchdogEvents } from '../events.js';
import { LogService } from '../logging/log.service.js';
import { ENGINE_TIMINGS, type EngineTimings } from './engine-timings.js';
import { HealthWaiter } from './health-waiter.service.js';
import { SweepLock } from './sweep-lock.js';

/**
 * Restarts containers whose health check turns unhealthy, as the legacy Start-Watchdog did.
 * Waits while an update runs. When the container has dependents (ContainerDependencies),
 * they are restarted once it is healthy again.
 */
@Injectable()
export class HealthMonitorService {
  private readonly handling = new Set<string>();

  constructor(
    private readonly config: ConfigService,
    private readonly containers: ContainersService,
    private readonly waiter: HealthWaiter,
    private readonly lock: SweepLock,
    private readonly log: LogService,
    @Inject(ENGINE_TIMINGS) private readonly timings: EngineTimings,
  ) {}

  @OnEvent(WatchdogEvents.ContainerUnhealthy, { async: true, promisify: true })
  async onUnhealthy(name: string): Promise<void> {
    // Health checks keep failing while a restart is under way; one recovery per container at a time.
    if (this.handling.has(name)) return;

    this.handling.add(name);

    try {
      await this.recover(name);
    } catch (error) {
      this.log.error(`Cannot recover container '${name}': ${(error as Error).message}`);
    } finally {
      this.handling.delete(name);
    }
  }

  private async recover(name: string): Promise<void> {
    this.log.warn(`Container '${name}' is unhealthy`);

    if (this.lock.held) {
      this.log.info(`Waiting for the update to finish before restarting '${name}'`);

      if (!(await this.lock.waitUntilFree(this.timings.lockWaitMs, this.timings.lockPollMs))) {
        this.log.warn(`The update is still running; skipping the restart of '${name}'`);

        return;
      }
    }

    if (!(await this.restart(name))) return;

    const dependents = this.config.values.ContainerDependencies[name] ?? [];

    if (!dependents.length) return;

    const unhealthy = await this.waiter.waitFor([name], this.timings.monitorHealthTimeoutMs);

    if (unhealthy.length) {
      this.log.warn(`Container '${name}' did not become healthy; skipping restarts of ${dependents.join(', ')}`);

      return;
    }

    for (const dependent of dependents) await this.restart(dependent);
  }

  /** True when the container was restarted. */
  private async restart(name: string): Promise<boolean> {
    try {
      const result = await this.containers.restart(name, { mode: 'restart', pull: false, dryRun: false }, 'monitor');

      return result.success;
    } catch (error) {
      // Not found (removed meanwhile) or already being restarted by someone else.
      if (error instanceof HttpException) {
        this.log.warn(`Cannot restart '${name}': ${error.message}`);

        return false;
      }

      throw error;
    }
  }
}
