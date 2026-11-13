// src/logger/logger.controller.ts

import { Controller, Get, InternalServerErrorException } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Controller('logs')
export class LoggerController {
    constructor(private readonly service: LoggerService) {}

    @Get('/')
    logs() {
        try {
            return this.service.getStream();
        } catch (error: any) {
            throw new InternalServerErrorException('Error Getting Logs', error.message);
        }
    }
}