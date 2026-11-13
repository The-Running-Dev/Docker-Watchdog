import { ConflictException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { RestartEvent, RestartResult, RestartSource, RestartTargetKind } from '@subzerodev/watchdog-shared';
import { CommandRunner } from '../docker/command-runner.service.js';
import { WatchdogEvents } from '../events.js';
import { LogService } from '../logging/log.service.js';
import { formatCommand, type CommandStep } from '../projects/compose-commands.js';

/** Enough of the output to explain a failure without flooding the log or the UI. */
export const MAX_DETAILS_LENGTH = 4000;

export interface RestartRequest {
  kind: RestartTargetKind;
  target: string;
  steps: CommandStep[];
  dryRun: boolean;
  source: RestartSource;
  /** Passed through to the restart event, for notifications. */
  monitor?: { name: string; url?: string };
  timeZone?: string;
}

/**
 * Runs restart steps in order, stopping at the first failure. One restart per target at a
 * time: a second request while one runs gets 409. A dry run reports the commands only.
 */
@Injectable()
export class RestartExecutor {
  private readonly running = new Set<string>();

  constructor(
    private readonly runner: CommandRunner,
    private readonly log: LogService,
    private readonly events: EventEmitter2,
  ) {}

  isRunning(kind: RestartTargetKind, target: string): boolean {
    return this.running.has(`${kind}:${target}`);
  }

  async execute(request: RestartRequest): Promise<RestartResult> {
    const key = `${request.kind}:${request.target}`;

    if (this.running.has(key)) {
      throw new ConflictException(`A restart of ${request.kind} '${request.target}' is already running`);
    }

    this.running.add(key);

    try {
      const result = request.dryRun ? this.dryRun(request) : await this.run(request);

      this.report(request, result);

      return result;
    } finally {
      this.running.delete(key);
    }
  }

  private dryRun({ kind, target, steps }: RestartRequest): RestartResult {
    return {
      success: true,
      kind,
      target,
      dryRun: true,
      message: `Dry run: would restart ${kind} '${target}'`,
      commands: steps.map(formatCommand),
    };
  }

  private async run({ kind, target, steps, source }: RestartRequest): Promise<RestartResult> {
    const commands = steps.map(formatCommand);

    this.log.info(`Restarting ${kind} '${target}' (${source})`);

    for (const step of steps) {
      this.log.debug(formatCommand(step));

      const { code, stdout, stderr } = await this.runner.run('docker', step.args, { cwd: step.cwd });

      if (code !== 0) {
        return {
          success: false,
          kind,
          target,
          dryRun: false,
          message: `Failed to restart ${kind} '${target}': '${step.step}' exited with ${code}`,
          commands,
          failedStep: step.step,
          details: capDetails(stderr.trim() || stdout.trim()),
        };
      }
    }

    return { success: true, kind, target, dryRun: false, message: `Restarted ${kind} '${target}'`, commands };
  }

  private report(request: RestartRequest, result: RestartResult): void {
    if (result.success) this.log.info(result.message);
    else this.log.error(result.message, result.details);

    const event: RestartEvent = {
      ...result,
      source: request.source,
      timestamp: new Date().toISOString(),
      monitor: request.monitor,
      timeZone: request.timeZone,
    };

    this.events.emit(WatchdogEvents.Restart, event);
  }
}

/** Keeps the end of the output, where the error usually is. */
export function capDetails(text: string): string {
  return text.length <= MAX_DETAILS_LENGTH ? text : `...${text.slice(-MAX_DETAILS_LENGTH)}`;
}
