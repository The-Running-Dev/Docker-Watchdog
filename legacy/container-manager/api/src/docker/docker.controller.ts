// src/auth/auth.controller.ts
import { environment } from 'src/config/environment';

import { Controller, Get, InternalServerErrorException } from '@nestjs/common';
import { Info, LogLevel } from 'container-manager-common';
import { DockerService } from './docker.service';
import { LoggerService } from '../logger';

@Controller('docker')
export class DockerController {
    constructor(
        private readonly dockerService: DockerService,
        private readonly loggerService: LoggerService,
        ) {
    }

    @Get('containers')
    async containers() {
        try {
            return await this.dockerService.getContainers();
        } catch (error: any) {
            throw new InternalServerErrorException('Error Getting Containers', error.message);
        }
    }

    @Get('info')
    async info() {
        try {
            const isRunningInsideDocker = await this.dockerService.isRunningInsideDocker();

            return {
                version: environment.version,
                buildDate: environment.buildDate,
                insideDocker: isRunningInsideDocker
            } as Info;
        } catch (error: any) {
            throw new InternalServerErrorException('Error Getting Info', error.message);
        }
    }
    
    async update() {
        try {
            const result = await this.dockerService.updateImage();

            if (result.success) {
                return { message: result.message };
            } else {
                throw new InternalServerErrorException(result.message);
            }
        } catch (error: any) {
            this.loggerService.log(`Unexpected Error: ${error.message}`, LogLevel.Error);

            throw new InternalServerErrorException("Unexpected Error", error.message);
        }
    }
}