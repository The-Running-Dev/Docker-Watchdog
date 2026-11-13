import { stat } from 'node:fs/promises';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service.js';
import { CommandRunner } from '../docker/command-runner.service.js';
import { DockerService } from '../docker/docker.service.js';
import { LogService } from '../logging/log.service.js';

/** What the updater needs before it can do anything. */
@Injectable()
export class PreflightService {
  constructor(
    private readonly config: ConfigService,
    private readonly docker: DockerService,
    private readonly runner: CommandRunner,
    private readonly log: LogService,
  ) {}

  /** Every problem found; empty when all is well. */
  async problems(): Promise<string[]> {
    const problems: string[] = [];
    const directory = this.config.values.ProjectsDirectory;

    if (!(await isDirectory(directory))) problems.push(`Projects directory ${directory} does not exist`);

    if ((await this.docker.version()) === null) {
      problems.push('Cannot reach the Docker engine');
    } else {
      const { code, stderr } = await this.runner.run('docker', ['compose', 'version'], { timeoutMs: 30_000 });

      if (code !== 0) problems.push(`docker compose is not available: ${stderr.trim()}`);
    }

    return problems;
  }

  /** Logs the result; true when there were no problems. */
  async check(): Promise<boolean> {
    const problems = await this.problems();

    for (const problem of problems) this.log.error(`Preflight: ${problem}`);

    if (!this.config.values.DiscordWebhookUrl) {
      this.log.warn('Preflight: DiscordWebhookUrl is not a Discord webhook URL; notifications are off');
    }

    return problems.length === 0;
  }
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}
