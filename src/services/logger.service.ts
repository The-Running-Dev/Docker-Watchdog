// src/services/logger.service.ts

import { injectable } from 'inversify';
import { createLogger, format, transports, Logger } from 'winston';
import { TransformableInfo } from 'logform';

@injectable()
export class LoggerService {
    private logger: Logger;
    private stream: string[] = [];

    constructor() {
        this.logger = createLogger({
            level: 'info',
            format: format.combine(
                format.timestamp(),
                format.printf((info: TransformableInfo) => {
                    const message = `${info.timestamp} [${info.level}]: ${(info.message as string).replace(/'/g, '')}`;
                    const data = info.meta ? ` ${JSON.stringify(info.meta)}` : '';
                    
                    return message + data;
                })
            ),
            transports: [
                new transports.Console(),
                new transports.File({ filename: 'Service.log' })
            ]
        });
    }

    info(message: string, data?: object) {
        const logMessage = `${message} ${data ? JSON.stringify(data) : ''}`;

        this.logger.info(message, { meta: data });
        this.addToStream(logMessage);
    }

    error(message: string, data?: object) {
        const logMessage = `${message} ${data ? JSON.stringify(data) : ''}`;

        this.logger.error(message, { meta: data });
        this.addToStream(logMessage);
    }

    warn(message: string, data?: object) {
        const logMessage = `${message} ${data ? JSON.stringify(data) : ''}`;

        this.logger.warn(message, { meta: data });
        this.addToStream(logMessage);
    }

    debug(message: string, data?: object) {
        const logMessage = `${message} ${data ? JSON.stringify(data) : ''}`;

        this.logger.debug(message, { meta: data });
        this.addToStream(logMessage);
    }

    getStream(): string[] {
        return this.stream;
    }

    private addToStream(message: string) {
        this.stream.push(message);

        // Keep the last 1000 log entries
        if (this.stream.length > 1000) {
            this.stream.shift();
        }
    }
}