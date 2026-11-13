import { OnEvent } from '@nestjs/event-emitter';
import { OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Containers, LogEntry, RestartEvent, UpdateRun } from '@subzerodev/watchdog-shared';
import type { Server } from 'socket.io';
import { AuthService } from '../auth/auth.service.js';
import { WatchdogEvents } from '../events.js';

/** Socket.io event names the UI listens for. */
export const SocketEvents = {
  Log: 'log-event',
  Containers: 'containers-event',
  Restart: 'restart-event',
  Update: 'update-event',
} as const;

/**
 * Pushes logs, container changes and restart results to the UI. Same origin only (no CORS);
 * when auth is on, the handshake must carry the API key or a login token.
 */
@WebSocketGateway()
export class EventsGateway implements OnGatewayInit {
  @WebSocketServer()
  private server?: Server;

  constructor(private readonly auth: AuthService) {}

  afterInit(server: Server): void {
    server.use((socket, next) => {
      const { auth, headers } = socket.handshake;
      const header = headers['x-api-key'];
      const apiKey = typeof auth.apiKey === 'string' ? auth.apiKey : Array.isArray(header) ? header[0] : header;
      const token = typeof auth.token === 'string' ? auth.token : undefined;

      next(this.auth.authenticate({ apiKey, token }) ? undefined : new Error('Unauthorized'));
    });
  }

  @OnEvent(WatchdogEvents.Log)
  onLog(entry: LogEntry): void {
    this.server?.emit(SocketEvents.Log, entry);
  }

  @OnEvent(WatchdogEvents.ContainersChanged)
  onContainers(projects: Containers[]): void {
    this.server?.emit(SocketEvents.Containers, projects);
  }

  @OnEvent(WatchdogEvents.Restart)
  onRestart(event: RestartEvent): void {
    this.server?.emit(SocketEvents.Restart, event);
  }

  @OnEvent(WatchdogEvents.UpdateFinished)
  onUpdate(run: UpdateRun): void {
    this.server?.emit(SocketEvents.Update, run);
  }
}
