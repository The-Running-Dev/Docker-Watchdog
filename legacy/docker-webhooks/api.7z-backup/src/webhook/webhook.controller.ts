// src/webhook/webhook.controller.ts

import {
    Controller,
    Post,
    Body,
    InternalServerErrorException,
    BadRequestException
} from '@nestjs/common';
import { LogLevel, WebhookRequest } from 'container-manager-common';
import { WebhookRequestSchema } from '../models';
import { DockerService } from '../docker';
import { LoggerService } from '../logger';

@Controller('webhook')
export class WebhookController {
    constructor(
        private readonly loggerService: LoggerService,
        private readonly dockerService: DockerService) {}

    @Post()
    async webhook(@Body() request: WebhookRequest) {
        this.loggerService.log('Webhook Posted:', LogLevel.Info, request);

        const { error } = WebhookRequestSchema.validate(request);

        if (error) {
            this.loggerService.log(`Validation Error: ${error.message}`, LogLevel.Error);

            throw new BadRequestException("Invalid Request Data", error.message);
        }

        try {
            return await this.dockerService.restartProjectOrContainer(request);
        } catch (error: any) {
            throw new InternalServerErrorException("Error Posting Webhook", error.message);
        }
    }
}