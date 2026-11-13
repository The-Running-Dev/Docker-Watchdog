import { injectable } from 'inversify';
import { LoggerService } from './logger.service';

@injectable()
export class LogStreamService {
    private loggerService: LoggerService;

    constructor(loggerService: LoggerService) {
        this.loggerService = loggerService;
    }

    getLogStream(): string[] {
        return this.loggerService.getStream();
    }
}