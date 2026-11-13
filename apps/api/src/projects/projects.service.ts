import { Injectable, NotFoundException } from '@nestjs/common';
import type { RestartResult, RestartSource } from '@subzerodev/watchdog-shared';
import { ConfigService } from '../config/config.service.js';
import { RestartExecutor } from '../restart/restart-executor.service.js';
import { projectRestartSteps } from './compose-commands.js';
import { findProject, type LocatedProject } from './project-locator.js';

export interface ProjectRestart {
  pull: boolean;
  hardReset: boolean;
  deleteVolumes: boolean;
  dryRun: boolean;
  /** Options for `docker compose up`; DockerComposeAdditionalArgs when not given. */
  additionalArgs?: string[];
}

@Injectable()
export class ProjectsService {
  constructor(
    private readonly config: ConfigService,
    private readonly executor: RestartExecutor,
  ) {}

  get projectsDirectory(): string {
    return this.config.values.ProjectsDirectory;
  }

  /** The project's directory and compose files, or null. */
  locate(name: string): Promise<LocatedProject | null> {
    return findProject(this.projectsDirectory, name);
  }

  async restart(name: string, options: ProjectRestart, source: RestartSource): Promise<RestartResult> {
    const project = await this.locate(name);

    if (!project) {
      throw new NotFoundException(`No compose file found for project '${name}' in ${this.projectsDirectory}`);
    }

    const steps = projectRestartSteps(project, {
      pull: options.pull,
      hardReset: options.hardReset,
      deleteVolumes: options.deleteVolumes,
      upArgs: options.additionalArgs ?? this.config.values.DockerComposeAdditionalArgs,
    });

    return this.executor.execute({ kind: 'project', target: name, steps, dryRun: options.dryRun, source });
  }
}
