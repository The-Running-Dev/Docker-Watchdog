// src/models/docker-image.model.ts

export interface DockerImage {
    name: string;
    tag: string;
    version: string;
    createdAt: Date;
}