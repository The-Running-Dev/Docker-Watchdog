// shared/models/docker-compose.model.ts

export interface DockerCompose {
    Name: string;
    WorkingDir: string;
    ComposeFile: string;
}