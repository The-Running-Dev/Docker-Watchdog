import { Body, ConflictException, Controller, Get, HttpCode, Post } from '@nestjs/common';
import type { UpdaterStatus } from '@subzerodev/watchdog-shared';
import { z } from 'zod';
import { parseBody } from '../common/parse-body.js';
import { UpdaterService } from './updater.service.js';

const runRequestSchema = z.object({
  /** Check for newer images without pulling or restarting; UpdaterTest when not given. */
  dryRun: z.boolean().optional(),
});

@Controller('updater')
export class UpdaterController {
  constructor(private readonly updater: UpdaterService) {}

  @Get()
  status(): UpdaterStatus {
    return this.updater.status();
  }

  /** Starts an update and answers at once; the result arrives as an update event and in GET /updater. */
  @Post('run')
  @HttpCode(202)
  run(@Body() body: unknown): UpdaterStatus {
    const { dryRun } = parseBody(runRequestSchema, body);
    const run = this.updater.run('api', { dryRun });

    if (!run) throw new ConflictException('An update is already running');

    return this.updater.status();
  }
}
