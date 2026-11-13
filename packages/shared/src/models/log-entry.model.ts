import type { LogLevel } from './log-level.enum.js';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}

/** GET /api/logs: newest first. */
export interface LogPage {
  total: number;
  page: number;
  pageCount: number;
  data: LogEntry[];
}
