// src/webhook/webhook.module.ts

import { Module } from '@nestjs/common';
import { WebhookController } from './webhoook.controller';
import { WebhookService } from './webhook.service';

@Module({
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [],
})
export class WebhookModule {}