import { Controller, Get } from '@nestjs/common';
import { ConfigService } from './config.service.js';

@Controller('config')
export class ConfigController {
  constructor(private readonly config: ConfigService) {}

  /** The running configuration, secrets masked. */
  @Get()
  get(): Record<string, unknown> {
    return this.config.masked();
  }
}
