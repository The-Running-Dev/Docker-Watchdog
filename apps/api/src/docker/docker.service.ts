import { Injectable, OnApplicationBootstrap, OnApplicationShutdown, ServiceUnavailableException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { ContainerHealth, Containers, DockerContainer } from '@subzerodev/watchdog-shared';
import Docker from 'dockerode';
import { WatchdogEvents } from '../events.js';
import { LogService } from '../logging/log.service.js';

export const COMPOSE_PROJECT_LABEL = 'com.docker.compose.project';
export const COMPOSE_SERVICE_LABEL = 'com.docker.compose.service';
export const COMPOSE_WORKING_DIR_LABEL = 'com.docker.compose.project.working_dir';
export const HEALTHY_STATES: ReadonlySet<string> = new Set(['healthy', 'running']);
const COMPOSE_CONFIG_FILES_LABEL = 'com.docker.compose.project.config_files';

const RECONNECT_DELAY_MS = 5_000;
const CHANGE_DEBOUNCE_MS = 1_000;

/**
 * Read access to the Docker engine. Every query goes to the engine, so nothing is stale;
 * changes made by the API go through CommandRunner. Uses DOCKER_HOST, else the default socket.
 */
@Injectable()
export class DockerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly docker = new Docker();
  private events?: NodeJS.ReadableStream;
  private reconnectTimer?: NodeJS.Timeout;
  private changeTimer?: NodeJS.Timeout;
  private stopped = false;

  constructor(
    private readonly log: LogService,
    private readonly emitter: EventEmitter2,
  ) {}

  /** The engine version, or null when the engine cannot be reached. */
  async version(): Promise<string | null> {
    try {
      return (await this.docker.version()).Version;
    } catch {
      return null;
    }
  }

  async listContainers(): Promise<DockerContainer[]> {
    try {
      const containers = await this.docker.listContainers({ all: true });

      return containers.map(toDockerContainer);
    } catch (error) {
      throw new ServiceUnavailableException(`Cannot reach the Docker engine: ${(error as Error).message}`);
    }
  }

  /** Containers grouped by compose project; standalone containers are under the project "". */
  async listProjects(): Promise<Containers[]> {
    return groupByProject(await this.listContainers());
  }

  /** The container with exactly this name, or null. */
  async findContainer(name: string): Promise<DockerContainer | null> {
    const containers = await this.listContainers();

    return containers.find((container) => container.Name === name) ?? null;
  }

  /** The image reference a container was created from and the ID of the image it runs, or null. */
  async containerImage(id: string): Promise<ContainerImage | null> {
    try {
      const info = await this.docker.getContainer(id).inspect();

      return { reference: info.Config.Image, imageId: info.Image };
    } catch {
      return null;
    }
  }

  /** The health check status, else the state ("running", "exited"...), or null when there is no such container. */
  async containerHealth(name: string): Promise<string | null> {
    try {
      const { State } = await this.docker.getContainer(name).inspect();

      return State.Health?.Status || State.Status;
    } catch {
      return null;
    }
  }

  /** The ID of the local image with this reference, or null when there is none. */
  async imageId(reference: string): Promise<string | null> {
    try {
      return (await this.docker.getImage(reference).inspect()).Id;
    } catch {
      return null;
    }
  }

  /**
   * True when the registry has a different image for the reference than the local one, found
   * without pulling. Assumes an update when either side cannot be read, as the legacy updater did.
   */
  async hasNewerImage(reference: string): Promise<boolean> {
    try {
      const [remote, local] = await Promise.all([
        this.docker.getImage(reference).distribution(),
        this.docker.getImage(reference).inspect(),
      ]);

      return !(local.RepoDigests ?? []).some((digest) => digest.endsWith(`@${remote.Descriptor.digest}`));
    } catch {
      return true;
    }
  }

  onApplicationBootstrap(): void {
    void this.watchEvents();
  }

  onApplicationShutdown(): void {
    this.stopped = true;
    clearTimeout(this.reconnectTimer);
    clearTimeout(this.changeTimer);
    (this.events as (NodeJS.ReadableStream & { destroy?: () => void }) | undefined)?.destroy?.();
  }

  /** Tells the UI about container changes, so it never has to poll. */
  private async watchEvents(): Promise<void> {
    if (this.stopped) return;

    try {
      const stream = await this.docker.getEvents({ filters: { type: ['container'] } });

      const lines = new EventLines();

      this.events = stream;
      this.log.info('Watching Docker container events');

      stream.on('data', (chunk: Buffer | string) => {
        this.scheduleChange();

        for (const event of lines.push(chunk.toString())) {
          const name = unhealthyContainer(event);

          if (name) this.emitter.emit(WatchdogEvents.ContainerUnhealthy, name);
        }
      });
      stream.on('error', (error: Error) => this.log.warn(`Docker event stream failed: ${error.message}`));
      stream.on('close', () => this.reconnect());
    } catch (error) {
      this.log.warn(
        `Cannot watch Docker events, retrying in ${RECONNECT_DELAY_MS / 1000}s: ${(error as Error).message}`,
      );
      this.reconnect();
    }
  }

  private reconnect(): void {
    if (this.stopped) return;

    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => void this.watchEvents(), RECONNECT_DELAY_MS);
    this.reconnectTimer.unref();
  }

  private scheduleChange(): void {
    clearTimeout(this.changeTimer);
    this.changeTimer = setTimeout(() => {
      this.listProjects()
        .then((projects) => this.emitter.emit(WatchdogEvents.ContainersChanged, projects))
        .catch((error: Error) => this.log.warn(`Cannot list containers: ${error.message}`));
    }, CHANGE_DEBOUNCE_MS);
    this.changeTimer.unref();
  }
}

export interface ContainerImage {
  /** As given to compose or `docker run`, e.g. "nginx:1.27". */
  reference: string;
  imageId: string;
}

export interface EngineEvent {
  Type?: string;
  Action?: string;
  status?: string;
  Actor?: { ID?: string; Attributes?: Record<string, string> };
}

/** The engine sends one JSON object per line; a chunk can end part way through one. */
export class EventLines {
  private rest = '';

  push(text: string): EngineEvent[] {
    const lines = (this.rest + text).split('\n');

    this.rest = lines.pop() ?? '';

    return lines.flatMap((line) => {
      if (!line.trim()) return [];

      try {
        return [JSON.parse(line) as EngineEvent];
      } catch {
        return [];
      }
    });
  }
}

/** The container name when the event is a health check turning unhealthy. */
export function unhealthyContainer(event: EngineEvent): string | null {
  const action = (event.Action ?? event.status ?? '').trim();

  if (event.Type !== 'container' || action !== 'health_status: unhealthy') return null;

  return event.Actor?.Attributes?.name ?? null;
}

export function toDockerContainer(info: Docker.ContainerInfo): DockerContainer {
  const labels = info.Labels ?? {};
  const { image, version } = splitImage(info.Image);

  return {
    Id: info.Id,
    Name: (info.Names[0] ?? info.Id).replace(/^\//, ''),
    Image: image,
    Version: version,
    Labels: labels,
    CreatedAt: new Date(info.Created * 1000).toISOString(),
    Status: info.Status,
    State: info.State,
    Health: parseHealth(info.Status),
    Project: labels[COMPOSE_PROJECT_LABEL] || undefined,
    Service: labels[COMPOSE_SERVICE_LABEL] || undefined,
    ConfigFiles: labels[COMPOSE_CONFIG_FILES_LABEL] ?? '',
  };
}

export function groupByProject(containers: DockerContainer[]): Containers[] {
  const projects = new Map<string, DockerContainer[]>();

  for (const container of containers) {
    const project = container.Project ?? '';

    projects.set(project, [...(projects.get(project) ?? []), container]);
  }

  return [...projects.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([Project, list]) => ({
      Project,
      Containers: list.sort((a, b) => a.Name.localeCompare(b.Name)),
    }));
}

/** "ghcr.io:443/org/app:1.2" -> { image: "ghcr.io:443/org/app", version: "1.2" } */
export function splitImage(reference: string): { image: string; version?: string } {
  const at = reference.indexOf('@');
  const withoutDigest = at === -1 ? reference : reference.slice(0, at);
  const colon = withoutDigest.lastIndexOf(':');

  if (colon === -1 || colon < withoutDigest.lastIndexOf('/') || withoutDigest.startsWith('sha256:')) {
    return { image: withoutDigest };
  }

  return { image: withoutDigest.slice(0, colon), version: withoutDigest.slice(colon + 1) };
}

/** Docker puts the health check result in the status text: "Up 5 minutes (healthy)". */
export function parseHealth(status: string): ContainerHealth | undefined {
  const match = status.match(/\((healthy|unhealthy|health: starting)\)/);

  if (!match) return undefined;

  return match[1] === 'health: starting' ? 'starting' : (match[1] as ContainerHealth);
}
