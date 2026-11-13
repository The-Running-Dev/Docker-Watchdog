import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller.js';
import { InfoController } from './info/info.controller.js';

@Module({
  controllers: [HealthController, InfoController],
})
export class AppModule {}
