import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  ContainerRestartOptions,
  DockerContainer,
  RestartResult,
  RestartSource,
} from '@subzerodev/watchdog-shared';
import { DockerService } from '../docker/docker.service.js';
import { containerRestartSteps, serviceRecreateSteps, type CommandStep } from '../projects/compose-commands.js';
import { ProjectsService } from '../projects/projects.service.js';
import { RestartExecutor, type RestartRequest } from '../restart/restart-executor.service.js';

export type RestartContext = Pick<RestartRequest, 'monitor' | 'timeZone'>;

@Injectable()
export class ContainersService {
  constructor(
    private readonly docker: DockerService,
    private readonly projects: ProjectsService,
    private readonly executor: RestartExecutor,
  ) {}

  list(): Promise<DockerContainer[]> {
    return this.docker.listContainers();
  }

  /**
   * "recreate" rebuilds a compose service from its project's compose files, so a new image or
   * changed config is picked up; containers outside a known project fall back to `docker restart`.
   * "restart" always uses `docker restart`.
   */
  async restart(
    name: string,
    options: ContainerRestartOptions,
    source: RestartSource,
    context: RestartContext = {},
  ): Promise<RestartResult> {
    const container = await this.docker.findContainer(name);

    if (!container) throw new NotFoundException(`Container '${name}' not found`);

    const steps = await this.steps(container, options);

    return this.executor.execute({
      kind: 'container',
      target: name,
      steps,
      dryRun: options.dryRun,
      source,
      ...context,
    });
  }

  private async steps(container: DockerContainer, options: ContainerRestartOptions): Promise<CommandStep[]> {
    if (options.mode === 'recreate' && container.Service) {
      const project = await this.projects.locateFor(container);

      if (project) return serviceRecreateSteps(project, container.Service, options.pull);
    }

    return containerRestartSteps(container.Name);
  }
}
