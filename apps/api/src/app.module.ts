import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthController } from './auth/auth.controller.js';
import { AuthGuard } from './auth/auth.guard.js';
import { AuthService } from './auth/auth.service.js';
import { loadConfig } from './config/config.loader.js';
import { ConfigController } from './config/config.controller.js';
import { ConfigService } from './config/config.service.js';
import { ContainersController } from './containers/containers.controller.js';
import { ContainersService } from './containers/containers.service.js';
import { CommandRunner } from './docker/command-runner.service.js';
import { DockerService } from './docker/docker.service.js';
import { EventsGateway } from './gateway/events.gateway.js';
import { HealthController } from './health/health.controller.js';
import { InfoController } from './info/info.controller.js';
import { LegacyController } from './legacy/legacy.controller.js';
import { LogService } from './logging/log.service.js';
import { LogsController } from './logging/logs.controller.js';
import { ProjectsController } from './projects/projects.controller.js';
import { ProjectsService } from './projects/projects.service.js';
import { RestartExecutor } from './restart/restart-executor.service.js';
import { WebhookController } from './webhook/webhook.controller.js';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [
    HealthController,
    InfoController,
    AuthController,
    ConfigController,
    LogsController,
    ProjectsController,
    ContainersController,
    WebhookController,
    LegacyController,
  ],
  providers: [
    { provide: ConfigService, useFactory: () => new ConfigService(loadConfig()) },
    LogService,
    AuthService,
    CommandRunner,
    DockerService,
    RestartExecutor,
    ProjectsService,
    ContainersService,
    EventsGateway,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
