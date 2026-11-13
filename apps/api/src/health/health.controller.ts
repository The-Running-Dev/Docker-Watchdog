import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  /** Liveness probe; the response body is part of the legacy contract. */
  @Get()
  check(): { status: 'healthy' } {
    return { status: 'healthy' };
  }
}
