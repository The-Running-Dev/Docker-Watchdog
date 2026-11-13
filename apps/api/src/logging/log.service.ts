import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LogLevel, type LogEntry, type LogPage } from '@subzerodev/watchdog-shared';
import { WatchdogEvents } from '../events.js';

export const LOG_CAPACITY = 1000;
export const MAX_PAGE_SIZE = 500;

/** Writes to the console and keeps the last LOG_CAPACITY entries for the UI. */
@Injectable()
export class LogService {
  private readonly logger = new Logger('Watchdog');
  private readonly entries: LogEntry[] = [];

  constructor(private readonly events: EventEmitter2) {}

  debug(message: string, data?: unknown): void {
    this.write(LogLevel.Debug, message, data);
  }

  info(message: string, data?: unknown): void {
    this.write(LogLevel.Info, message, data);
  }

  warn(message: string, data?: unknown): void {
    this.write(LogLevel.Warn, message, data);
  }

  error(message: string, data?: unknown): void {
    this.write(LogLevel.Error, message, data);
  }

  /** Newest first. */
  page(page: number, limit: number): LogPage {
    const safePage = Math.max(1, Math.floor(page) || 1);
    const safeLimit = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(limit) || 1));
    const total = this.entries.length;
    const start = (safePage - 1) * safeLimit;

    return {
      total,
      page: safePage,
      pageCount: Math.ceil(total / safeLimit),
      data: this.entries
        .slice()
        .reverse()
        .slice(start, start + safeLimit),
    };
  }

  private write(level: LogLevel, message: string, data?: unknown): void {
    const text = data === undefined ? message : `${message} ${stringify(data)}`;

    switch (level) {
      case LogLevel.Error:
        this.logger.error(text);
        break;
      case LogLevel.Warn:
        this.logger.warn(text);
        break;
      case LogLevel.Debug:
        this.logger.debug(text);
        break;
      default:
        this.logger.log(text);
    }

    const entry: LogEntry = { timestamp: new Date().toISOString(), level, message: text };

    this.entries.push(entry);

    if (this.entries.length > LOG_CAPACITY) this.entries.shift();

    this.events.emit(WatchdogEvents.Log, entry);
  }
}

function stringify(data: unknown): string {
  if (data instanceof Error) return data.message;

  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}
