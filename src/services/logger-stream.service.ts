import TYPES from '../types';
import { inject, injectable } from 'inversify';
import { LoggerService } from './logger.service';

@injectable()
export class LoggerStreamService {
    private loggerService: LoggerService;

    constructor(
        @inject(TYPES.LoggerService) loggerService: LoggerService
    ) {
        this.loggerService = loggerService;
    }

    getStream(): string[] {
        return this.loggerService.getStream();
    }
}