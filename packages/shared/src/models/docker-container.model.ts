export type ContainerHealth = 'healthy' | 'unhealthy' | 'starting';

export interface DockerContainer {
  Id: string;
  Name: string;
  Image: string;
  Labels: Record<string, string>;
  /** ISO 8601 timestamp; dates cross the wire as strings. */
  CreatedAt: string;
  /** Docker's human status, e.g. "Up 2 hours (healthy)". */
  Status: string;
  /** Docker's machine state, e.g. "running" or "exited". */
  State: string;
  /** Health check result, absent when the container has no health check. */
  Health?: ContainerHealth;
  /** Compose project (com.docker.compose.project), absent for standalone containers. */
  Project?: string;
  /** Compose service (com.docker.compose.service), absent for standalone containers. */
  Service?: string;
  ConfigFiles: string;
  Version?: string;
}
