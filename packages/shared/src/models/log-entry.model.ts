import type { LogLevel } from './log-level.enum.js';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}
