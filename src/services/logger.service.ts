// src/services/logger.service.ts

import { injectable } from 'inversify';
import { createLogger, format, transports, Logger } from 'winston';
import { TransformableInfo } from 'logform';

@injectable()
export class LoggerService {
    private logger: Logger;

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
                new transports.File({ filename: 'Combined.log' })
            ]
        });
    }

    info(message: string, data?: object) {
        this.logger.info(message, { meta: data });
    }

    error(message: string, data?: object) {
        this.logger.error(message, { meta: data });
    }

    warn(message: string, data?: object) {
        this.logger.warn(message, { meta: data });
    }

    debug(message: string, data?: object) {
        this.logger.debug(message, { meta: data });
    }
}