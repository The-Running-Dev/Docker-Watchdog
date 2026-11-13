// src/logger/logger.module.ts

import { Global, Module } from '@nestjs/common';
import { LoggerController } from './logger.controller';
import { LoggerService } from './logger.service';
import { EventsGateway } from '../gateway/events.gateway';

@Global()
@Module({
  controllers: [LoggerController],
  providers: [LoggerService, EventsGateway],
  exports: [LoggerService],
})
export class LoggerModule {}