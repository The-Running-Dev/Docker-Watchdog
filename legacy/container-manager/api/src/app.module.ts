import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './auth/auth.module';
import { DockerModule, DockerService } from './docker';
import { LoggerModule, LoggerService } from './logger';
import { LogLevel } from 'container-manager-common';
import { PromptUtils } from './utils';
import { WebhookModule } from './webhook';

import { environment } from './config/environment';

@Module({
  imports: [AuthModule, DockerModule, LoggerModule, WebhookModule],
  controllers: [AppController],
  providers: [AppService],
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
