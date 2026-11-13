// shared/models/docker-container.model.ts

export interface DockerContainer {
    Id: string;
    Name: string;
    Image: string;
    Labels: { [label: string]: string };
    CreatedAt: Date;
    Status: string;
    ConfigFiles: string;
    Version?: string;
}