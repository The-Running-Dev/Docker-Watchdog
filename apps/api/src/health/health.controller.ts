import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator.js';

@Controller('health')
export class HealthController {
  /** Liveness probe; the response body is part of the legacy contract. Never needs auth. */
  @Public()
  @Get()
  check(): { status: 'healthy' } {
    return { status: 'healthy' };
  }
}
