import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { projectRestartOptionsSchema, type Containers, type RestartResult } from '@subzerodev/watchdog-shared';
import { failOnError } from '../common/fail-on-error.js';
import { parseBody } from '../common/parse-body.js';
import { DockerService } from '../docker/docker.service.js';
import { ProjectsService } from './projects.service.js';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly docker: DockerService,
  ) {}

  /** Live containers grouped by compose project. */
  @Get()
  list(): Promise<Containers[]> {
    return this.docker.listProjects();
  }

  @Post(':name/restart')
  @HttpCode(HttpStatus.OK)
  async restart(@Param('name') name: string, @Body() body: unknown): Promise<RestartResult> {
    const options = parseBody(projectRestartOptionsSchema, body);

    return failOnError(await this.projects.restart(name, options, 'api'));
  }
}
