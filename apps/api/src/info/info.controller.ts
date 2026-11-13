import { existsSync } from 'node:fs';
import { Controller, Get } from '@nestjs/common';
import type { Info } from '@subzerodev/watchdog-shared';
import { AuthService } from '../auth/auth.service.js';
import { DockerService } from '../docker/docker.service.js';

@Controller('info')
export class InfoController {
  constructor(
    private readonly docker: DockerService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  async get(): Promise<Info> {
    return {
      version: process.env.APP_VERSION ?? '0.0.0-dev',
      buildDate: process.env.BUILD_DATE ?? '',
      insideDocker: existsSync('/.dockerenv'),
      dockerVersion: await this.docker.version(),
      authEnabled: this.auth.enabled,
      loginEnabled: this.auth.loginEnabled,
    };
  }
}
