import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
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
import { DEFAULT_ENGINE_TIMINGS, ENGINE_TIMINGS } from './engine/engine-timings.js';
import { HealthMonitorService } from './engine/health-monitor.service.js';
import { HealthWaiter } from './engine/health-waiter.service.js';
import { PreflightService } from './engine/preflight.service.js';
import { SweepLock } from './engine/sweep-lock.js';
import { UpdaterController } from './engine/updater.controller.js';
import { UpdaterService } from './engine/updater.service.js';
import { EventsGateway } from './gateway/events.gateway.js';
import { HealthController } from './health/health.controller.js';
import { InfoController } from './info/info.controller.js';
import { LegacyController } from './legacy/legacy.controller.js';
import { LogService } from './logging/log.service.js';
import { LogsController } from './logging/logs.controller.js';
import { DiscordService } from './notifications/discord.service.js';
import { ProjectsController } from './projects/projects.controller.js';
import { ProjectsService } from './projects/projects.service.js';
import { RestartExecutor } from './restart/restart-executor.service.js';
import { UiModule } from './ui/ui.module.js';
import { WebhookController } from './webhook/webhook.controller.js';

@Module({
  imports: [EventEmitterModule.forRoot(), ScheduleModule.forRoot(), UiModule.register()],
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
    UpdaterController,
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
    { provide: ENGINE_TIMINGS, useValue: DEFAULT_ENGINE_TIMINGS },
    SweepLock,
    HealthWaiter,
    PreflightService,
    UpdaterService,
    HealthMonitorService,
    DiscordService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
