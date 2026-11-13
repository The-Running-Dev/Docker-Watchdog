import type { DockerContainer } from './docker-container.model.js';

/** A compose project and the containers that belong to it. */
export interface Containers {
  Project: string;
  Containers: DockerContainer[];
}
