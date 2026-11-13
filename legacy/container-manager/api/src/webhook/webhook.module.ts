// src/webhook/webhook.module.ts

import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { DockerModule } from '../docker';
import { LoggerModule } from '../logger';

@Module({
  imports: [DockerModule, LoggerModule],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [],
})
export class WebhookModule {}