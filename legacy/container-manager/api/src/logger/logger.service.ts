// src/logger/logger.service.ts

import { Injectable } from '@nestjs/common';
import { createLogger, format, transports, Logger } from 'winston';
import { TransformableInfo } from 'logform';
import { format as dateFnsFormat } from 'date-fns';
import { LogEntry, LogLevel } from 'container-manager-common';
import { EventsGateway } from '../gateway/events.gateway';

@Injectable()
export class LoggerService {
    private logger: Logger;
    private stream: LogEntry[] = [];

    constructor(
        private readonly gateway: EventsGateway
    ) {
        this.logger = createLogger({
            level: 'info',
            format: format.combine(
                format.timestamp(),
                format.printf((info: TransformableInfo) => {
                    const message = `${dateFnsFormat(new Date(info.timestamp as string), 'yyyy.MM.dd @ HH.mm.ss')} [${info.level}]: ${(info.message as string).replace(/'/g, '')}`;
                    const data = info.meta ? ` ${JSON.stringify(info.meta)}` : '';

                    return message + data;
                })
            ),
            transports: [
                new transports.Console(),
                new transports.File({filename: 'Service.log'})
            ]
        });
    }

    log(message: string, level: LogLevel, data?: object) {
        const timestamp = new Date().toISOString();
        const logMethod = this.logger[level.toLowerCase() as keyof Logger].bind(this.logger);

        logMethod(message, {meta: data});

        if (data) {
            message += ` ${JSON.stringify(data)}`;
        }

        this.addToStream({timestamp, level, message} as LogEntry);
    }

    getStream(): LogEntry[] {
        return this.stream;
    }

    getPaginatedStream(page: number, limit: number): {
        total: number;
        page: number;
        pageCount: number;
        data: LogEntry[];
    } {
        const MAX_LIMIT = 500;

        const safeLimit = Math.min(limit, MAX_LIMIT);
        const total = this.stream.length;
        const pageCount = Math.ceil(total / safeLimit);
        const start = (page - 1) * safeLimit;
        const end = start + safeLimit;

        const data = this.stream
            .slice()
            .reverse()
            .slice(start, end);

        return {
            total,
            page,
            pageCount,
            data
        };
    }

    private addToStream(logEntry: LogEntry) {
        this.notifyClients(logEntry);
        this.stream.push(logEntry);

        // Keep the last 1000 log entries
        if (this.stream.length > 1000) {
            this.stream.shift();
        }
    }

    private notifyClients(logEntry: LogEntry) {
        this.gateway.sendCustomEvent('log-event', logEntry);
    }
}