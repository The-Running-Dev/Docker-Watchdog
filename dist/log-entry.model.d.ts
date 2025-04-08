import { LogLevel } from './log-level.enum';
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
}
