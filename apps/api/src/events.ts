/** In-process events (EventEmitter2). The gateway forwards them to socket.io clients. */
export const WatchdogEvents = {
  /** Payload: LogEntry */
  Log: 'watchdog.log',
  /** Payload: Containers[] */
  ContainersChanged: 'watchdog.containers',
  /** Payload: RestartEvent. Notifications subscribe to this. */
  Restart: 'watchdog.restart',
  /** Payload: the container name. A health check just reported "unhealthy". */
  ContainerUnhealthy: 'watchdog.container-unhealthy',
  /** Payload: UpdateRun. */
  UpdateFinished: 'watchdog.update',
} as const;
