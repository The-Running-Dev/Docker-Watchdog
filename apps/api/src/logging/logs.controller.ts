import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { LogService, type LogPage } from './log.service.js';

@Controller('logs')
export class LogsController {
  constructor(private readonly log: LogService) {}

  @Get()
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ): LogPage {
    return this.log.page(page, limit);
  }
}
