// src/services/logger.service.test.ts

import { LoggerService } from './logger.service';
import { createLogger } from 'winston';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';

jest.mock('winston', () => {
    const mLogger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    };
    return {
        createLogger: jest.fn(() => mLogger),
        transports: {
            Console: jest.fn(),
            File: jest.fn(),
        },
        format: {
            combine: jest.fn(),
            timestamp: jest.fn(),
            printf: jest.fn(),
        },
    };
});

describe('LoggerService', () => {
    let loggerService: LoggerService;
    let logger: any;

    beforeEach(() => {
        loggerService = new LoggerService();
        logger = (createLogger as jest.Mock).mock.results[0].value;
    });

    it('Should Log Info Messages', () => {
        const message = 'Info message';
        const data = { key: 'value' };

        loggerService.info(message, data);

        expect(logger.info).toHaveBeenCalledWith(message, { meta: data });
    });

    it('Should Log Error Messages', () => {
        const message = 'Error message';
        const data = { key: 'value' };

        loggerService.error(message, data);

        expect(logger.error).toHaveBeenCalledWith(message, { meta: data });
    });

    it('Should Log Warn Messages', () => {
        const message = 'Warn message';
        const data = { key: 'value' };

        loggerService.warn(message, data);

        expect(logger.warn).toHaveBeenCalledWith(message, { meta: data });
    });

    it('Should Log Debug Messages', () => {
        const message = 'Debug message';
        const data = { key: 'value' };

        loggerService.debug(message, data);

        expect(logger.debug).toHaveBeenCalledWith(message, { meta: data });
    });
});