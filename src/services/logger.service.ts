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
                    const meta = info.meta ? ` ${JSON.stringify(info.meta)}` : '';
                    return message + meta;
                })
            ),
            transports: [
                new transports.Console(),
                new transports.File({ filename: 'Combined.log' })
            ]
        });
    }

    info(message: string, meta?: object) {
        this.logger.info(message, { meta });
    }

    error(message: string, meta?: object) {
        this.logger.error(message, { meta });
    }

    warn(message: string, meta?: object) {
        this.logger.warn(message, { meta });
    }

    debug(message: string, meta?: object) {
        this.logger.debug(message, { meta });
    }
}