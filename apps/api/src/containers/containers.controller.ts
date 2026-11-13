import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { containerRestartOptionsSchema, type DockerContainer, type RestartResult } from '@subzerodev/watchdog-shared';
import { failOnError } from '../common/fail-on-error.js';
import { parseBody } from '../common/parse-body.js';
import { ContainersService } from './containers.service.js';

@Controller('containers')
export class ContainersController {
  constructor(private readonly containers: ContainersService) {}

  @Get()
  list(): Promise<DockerContainer[]> {
    return this.containers.list();
  }

  @Post(':name/restart')
  @HttpCode(HttpStatus.OK)
  async restart(@Param('name') name: string, @Body() body: unknown): Promise<RestartResult> {
    const options = parseBody(containerRestartOptionsSchema, body);

    return failOnError(await this.containers.restart(name, options, 'api'));
  }
}
