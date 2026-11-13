// src/logger/logger.controller.ts

import {
    Controller,
    Get,
    InternalServerErrorException,
    Query,
    ParseIntPipe,
    DefaultValuePipe
} from '@nestjs/common';
import { LoggerService } from './logger.service';

@Controller('logs')
export class LoggerController {
    constructor(private readonly service: LoggerService) {}

    @Get('/')
    logs(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    ) {
        try {
            return this.service.getPaginatedStream(page, limit);
        } catch (error: any) {
            throw new InternalServerErrorException('Error Getting Logs', error.message);
        }
    }
}