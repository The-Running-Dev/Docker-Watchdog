// src/webhook/webhook.controller.ts

import { Controller, Get, InternalServerErrorException } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Controller('logs')
export class LoggerController {
    constructor(private readonly service: LoggerService) {}

    @Get('/')
    login() {
        try {
            return this.service.getStream();
        } catch (error: any) {
            throw new InternalServerErrorException('Error Fetching Logs', error.message);
        }
    }
}