import { Inject, Injectable, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import type {
  Containers,
  DockerContainer,
  ProjectUpdate,
  UpdateRun,
  UpdaterStatus,
  UpdateTrigger,
} from '@subzerodev/watchdog-shared';
import { CronJob } from 'cron';
import { ConfigService } from '../config/config.service.js';
import { CommandRunner } from '../docker/command-runner.service.js';
import { DockerService, groupByProject } from '../docker/docker.service.js';
import { WatchdogEvents } from '../events.js';
import { LogService } from '../logging/log.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { ENGINE_TIMINGS, sleep, type EngineTimings } from './engine-timings.js';
import { HealthWaiter } from './health-waiter.service.js';
import { PreflightService } from './preflight.service.js';
import { SweepLock } from './sweep-lock.js';

export const UPDATER_JOB = 'updater';
const LOCK_OWNER = 'updater';

export interface UpdateOptions {
  /** Check for newer images only; UpdaterTest when not given. */
  dryRun?: boolean;
}

/**
 * Brings running compose projects up to date, the way the legacy Start-Update did: pull each
 * image once, recreate the projects whose image changed, wait for them to be healthy, prune.
 * A dry run asks the registry instead of pulling and restarts nothing.
 */
@Injectable()
export class UpdaterService implements OnApplicationBootstrap, OnApplicationShutdown {
  private lastRun: UpdateRun | null = null;
  private job?: CronJob;

  constructor(
    private readonly config: ConfigService,
    private readonly docker: DockerService,
    private readonly runner: CommandRunner,
    private readonly projects: ProjectsService,
    private readonly waiter: HealthWaiter,
    private readonly lock: SweepLock,
    private readonly preflight: PreflightService,
    private readonly log: LogService,
    private readonly events: EventEmitter2,
    private readonly scheduler: SchedulerRegistry,
    @Inject(ENGINE_TIMINGS) private readonly timings: EngineTimings,
  ) {}

  get running(): boolean {
    return this.lock.owner === LOCK_OWNER;
  }

  status(): UpdaterStatus {
    const { CronSchedule, TimeZone } = this.config.values;

    return {
      scheduled: Boolean(this.job),
      schedule: CronSchedule,
      timeZone: TimeZone,
      running: this.running,
      nextRun: this.job ? this.job.nextDate().toISO() : null,
      lastRun: this.lastRun,
    };
  }

  onApplicationBootstrap(): void {
    const { UpdaterCronJob, UpdateOnStart } = this.config.values;

    if (UpdaterCronJob) this.schedule();

    if (UpdateOnStart) this.runInBackground('startup');
    else void this.preflight.check();
  }

  onApplicationShutdown(): void {
    void this.job?.stop();
  }

  /** Starts a run; null when an update is already running. */
  run(trigger: UpdateTrigger, options: UpdateOptions = {}): Promise<UpdateRun> | null {
    if (!this.lock.tryAcquire(LOCK_OWNER)) return null;

    const dryRun = options.dryRun ?? this.config.values.UpdaterTest;

    return this.sweep(trigger, dryRun).finally(() => this.lock.release());
  }

  private runInBackground(trigger: UpdateTrigger): void {
    const run = this.run(trigger);

    if (!run) this.log.warn(`Update (${trigger}) skipped: an update is already running`);
  }

  private schedule(): void {
    const { CronSchedule, TimeZone } = this.config.values;

    try {
      this.job = CronJob.from({
        cronTime: CronSchedule,
        onTick: () => this.runInBackground('schedule'),
        timeZone: TimeZone,
        start: true,
      });
      this.scheduler.addCronJob(UPDATER_JOB, this.job);
      this.log.info(`Updater scheduled at '${CronSchedule}' (${TimeZone}); next run ${this.job.nextDate().toISO()}`);
    } catch (error) {
      this.job = undefined;
      this.log.error(`Cannot schedule the updater: ${(error as Error).message}`);
    }
  }

  private async sweep(trigger: UpdateTrigger, dryRun: boolean): Promise<UpdateRun> {
    const startedAt = new Date().toISOString();
    const run: UpdateRun = {
      trigger,
      dryRun,
      startedAt,
      finishedAt: startedAt,
      checked: 0,
      skipped: 0,
      updated: [],
      summary: '',
    };

    this.log.info(`Update started (${trigger}${dryRun ? ', dry run' : ''})`);

    try {
      if (await this.preflight.check()) {
        await this.update(run);
      } else {
        run.error = 'Preflight failed';
      }
    } catch (error) {
      run.error = (error as Error).message;
    }

    run.summary = run.updated.map((update) => update.message).join('\n');
    run.finishedAt = new Date().toISOString();

    if (run.error) this.log.error(`Update failed: ${run.error}`);
    else {
      this.log.info(
        `Update finished: ${run.checked} projects checked, ${run.updated.length} updated, ${run.skipped} skipped`,
      );
    }

    this.lastRun = run;
    this.events.emit(WatchdogEvents.UpdateFinished, run);

    return run;
  }

  private async update(run: UpdateRun): Promise<void> {
    const running = (await this.docker.listContainers()).filter((c) => c.Project && c.State === 'running');
    const checker = new ImageChecker(this.docker, this.runner, this.log, run.dryRun);

    for (const group of groupByProject(running)) {
      if (!this.included(group.Project)) {
        run.skipped++;
        continue;
      }

      run.checked++;

      const images = await checker.newerImages(group.Containers);

      if (!images.length) continue;

      this.log.info(`${group.Project}: newer image for ${images.join(', ')}`);
      run.updated.push(await this.restart(group, images, run.dryRun));
    }

    if (!run.dryRun && run.updated.length && this.config.values.PruneAfterUpdate) await this.prune();
  }

  private async restart(group: Containers, images: string[], dryRun: boolean): Promise<ProjectUpdate> {
    const name = group.Project;
    const outcome = (success: boolean, message: string, unhealthy: string[] = []): ProjectUpdate => ({
      project: name,
      images,
      success,
      unhealthy,
      message: ` - ${name}: ${message}`,
    });

    const project = await this.projects.locateFor(group.Containers[0]!);

    if (!project) return outcome(false, '⚠️ Compose Files Not Found.');

    try {
      const result = await this.projects.restart(
        project.name,
        { pull: false, hardReset: false, deleteVolumes: false, dryRun },
        'updater',
      );

      if (!result.success) return outcome(false, `❌ Restart Failed (${result.failedStep}).`);
    } catch (error) {
      return outcome(false, `❌ Restart Failed: ${(error as Error).message}.`);
    }

    if (dryRun) return outcome(true, '🧪 Update Available (Dry Run).');

    await sleep(this.timings.settleMs);

    const names = (await this.docker.listContainers()).filter((c) => c.Project === name).map((c) => c.Name);
    const unhealthy = await this.waiter.waitFor(names, this.timings.updateHealthTimeoutMs);

    return unhealthy.length
      ? outcome(false, `⚠️ Services Unhealthy:\n${unhealthy.map((n) => `  - ${n}`).join('\n')}.`, unhealthy)
      : outcome(true, '✅ All Services Healthy.');
  }

  private async prune(): Promise<void> {
    const { code, stdout, stderr } = await this.runner.run('docker', ['image', 'prune', '--all', '--force']);

    if (code === 0) this.log.info(`Pruned unused images${reclaimed(stdout)}`);
    else this.log.warn(`Image prune failed: ${stderr.trim()}`);
  }

  /** IncludeProjects when it is set, else everything not in ExcludeProjects. Case does not matter. */
  private included(project: string): boolean {
    const { IncludeProjects, ExcludeProjects } = this.config.values;
    const matches = (list: string[]) => list.some((item) => item.toLowerCase() === project.toLowerCase());

    return IncludeProjects.length ? matches(IncludeProjects) : !matches(ExcludeProjects);
  }
}

/** Checks each image reference once per run. */
class ImageChecker {
  private readonly latest = new Map<string, Promise<string | null>>();
  private readonly remote = new Map<string, Promise<boolean>>();

  constructor(
    private readonly docker: DockerService,
    private readonly runner: CommandRunner,
    private readonly log: LogService,
    private readonly dryRun: boolean,
  ) {}

  /** The references of the containers whose image has a newer version. */
  async newerImages(containers: DockerContainer[]): Promise<string[]> {
    const newer = new Set<string>();

    for (const container of containers) {
      const image = await this.docker.containerImage(container.Id);

      // Digest-pinned and ID-only references can never change.
      if (!image || image.reference.includes('@') || image.reference.startsWith('sha256:')) continue;

      if (await this.isNewer(image.reference, image.imageId)) newer.add(image.reference);
    }

    return [...newer];
  }

  private async isNewer(reference: string, runningId: string): Promise<boolean> {
    if (!this.dryRun) {
      const latest = await this.once(this.latest, reference, () => this.pull(reference));

      return latest !== null && latest !== runningId;
    }

    // A dry run never pulls: an image pulled earlier but not yet used counts, as does a newer one in the registry.
    const local = await this.docker.imageId(reference);

    if (local && local !== runningId) return true;

    return this.once(this.remote, reference, () => this.docker.hasNewerImage(reference));
  }

  private async pull(reference: string): Promise<string | null> {
    const { code, stderr } = await this.runner.run('docker', ['pull', reference]);

    if (code !== 0) {
      this.log.warn(`Cannot pull ${reference}: ${stderr.trim()}`);

      return null;
    }

    return this.docker.imageId(reference);
  }

  private once<T>(cache: Map<string, Promise<T>>, key: string, load: () => Promise<T>): Promise<T> {
    let value = cache.get(key);

    if (!value) cache.set(key, (value = load()));

    return value;
  }
}

function reclaimed(output: string): string {
  const match = output.match(/Total reclaimed space:\s*(.+)/);

  return match ? ` (${match[1]!.trim()} reclaimed)` : '';
}
