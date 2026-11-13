/** In-process events (EventEmitter2). The gateway forwards them to socket.io clients. */
export const WatchdogEvents = {
  /** Payload: LogEntry */
  Log: 'watchdog.log',
  /** Payload: Containers[] */
  ContainersChanged: 'watchdog.containers',
  /** Payload: RestartEvent. Phase 4 notifications subscribe to this. */
  Restart: 'watchdog.restart',
} as const;
