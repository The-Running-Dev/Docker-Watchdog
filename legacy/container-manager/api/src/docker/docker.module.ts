// src/docker/docker.module.ts

import { Global, Module } from '@nestjs/common';
import { DockerService } from './docker.service';
import { DockerController } from './docker.controller';
import { LoggerModule } from '../logger';
import { ShellModule } from '../shell/shell.module';
import { EventsGateway } from '../gateway/events.gateway';

@Global()
@Module({
  imports: [LoggerModule, ShellModule],
  controllers: [DockerController],
  providers: [DockerService, EventsGateway],
  exports: [DockerService],
})
export class DockerModule {}