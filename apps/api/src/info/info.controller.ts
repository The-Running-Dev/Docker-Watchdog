import { existsSync } from 'node:fs';
import { Controller, Get } from '@nestjs/common';
import type { Info } from '@subzerodev/watchdog-shared';

@Controller('info')
export class InfoController {
  @Get()
  get(): Info {
    return {
      version: process.env.APP_VERSION ?? '0.0.0-dev',
      buildDate: process.env.BUILD_DATE ?? '',
      insideDocker: existsSync('/.dockerenv'),
    };
  }
}
