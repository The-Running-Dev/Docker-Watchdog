import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}


import { environment } from './config/environment';

import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DockerModule } from './docker/docker.module';
import { LoggerModule } from './logger/logger.module';
import { WebhookModule } from './webhook/webhook.module';

import { DockerService } from './docker/docker.service';
import { LoggerService } from './logger/logger.service';
import { LogLevel } from '../../shared/models';
import { PromptUtils } from './utils';

@Module({
  imports: [AuthModule, DockerModule, LoggerModule, WebhookModule],
  providers: [DockerService, LoggerService],
})
export class AppModule {
  constructor(private readonly dockerService: DockerService, private readonly loggerService: LoggerService) {
    this.initializeServices();
  }

  private async initializeServices() {
    await this.dockerService.initialize();

    if (environment.runInteractive) {
      await PromptUtils.promptUserForMethod(this.dockerService, this.loggerService);
    }

    this.loggerService.log(`Docker-Webhooks, v${environment.version} (${environment.buildDate}), Running on Port: ${environment.port}`, LogLevel.Info);
  }
}
