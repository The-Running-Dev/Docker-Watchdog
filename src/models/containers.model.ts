// shared/models/containers.model.ts

import { DockerContainer } from './docker-container.model';

export interface Containers {
    Project: string;
    Containers:  DockerContainer[];
}