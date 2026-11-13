import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { groupByProject } from '../src/docker/docker.service.js';
import type { Containers, DockerContainer } from '@subzerodev/watchdog-shared';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { appConfigSchema, type AppConfig } from '../src/config/app-config.schema.js';
import { ConfigService } from '../src/config/config.service.js';
import { CommandRunner, type CommandOptions, type CommandResult } from '../src/docker/command-runner.service.js';
import { COMPOSE_WORKING_DIR_LABEL, DockerService } from '../src/docker/docker.service.js';

export interface RunnerCall {
  file: string;
  args: string[];
  cwd?: string;
}

/** Records every command; answers with queued results, else success. */
export class FakeRunner {
  readonly calls: RunnerCall[] = [];
  private readonly results: CommandResult[] = [];

  failNext(stderr: string, code = 1): this {
    this.results.push({ code, stdout: '', stderr });

    return this;
  }

  async run(file: string, args: string[], options: CommandOptions = {}): Promise<CommandResult> {
    this.calls.push({ file, args, cwd: options.cwd });

    return this.results.shift() ?? { code: 0, stdout: '', stderr: '' };
  }
}

export class FakeDocker {
  containers: DockerContainer[] = [];
  engineVersion: string | null = '29.0.0';

  async version(): Promise<string | null> {
    return this.engineVersion;
  }

  async listContainers(): Promise<DockerContainer[]> {
    return this.containers;
  }

  async listProjects(): Promise<Containers[]> {
    return groupByProject(this.containers);
  }

  async findContainer(name: string): Promise<DockerContainer | null> {
    return this.containers.find((c) => c.Name === name) ?? null;
  }
}

export function container(
  name: string,
  compose?: { project: string; service: string; workingDir?: string },
): DockerContainer {
  const labels: Record<string, string> = compose
    ? {
        'com.docker.compose.project': compose.project,
        'com.docker.compose.service': compose.service,
        ...(compose.workingDir ? { [COMPOSE_WORKING_DIR_LABEL]: compose.workingDir } : {}),
      }
    : {};

  return {
    Id: `id-${name}`,
    Name: name,
    Image: 'nginx',
    Version: 'latest',
    Labels: labels,
    CreatedAt: new Date(0).toISOString(),
    Status: 'Up 1 minute',
    State: 'running',
    Project: compose?.project,
    Service: compose?.service,
    ConfigFiles: '',
  };
}

/** A temp directory tree: { 'stack/web/compose.yaml': '' } */
export function tempTree(files: Record<string, string>): { root: string; dispose: () => void } {
  const root = mkdtempSync(join(tmpdir(), 'watchdog-'));

  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path);

    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }

  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
}

export interface TestApp {
  app: INestApplication;
  runner: FakeRunner;
  docker: FakeDocker;
  config: AppConfig;
}

export async function createTestApp(config: Partial<Record<keyof AppConfig, unknown>> = {}): Promise<TestApp> {
  const runner = new FakeRunner();
  const docker = new FakeDocker();
  const values = appConfigSchema.parse(config);

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ConfigService)
    .useValue(new ConfigService(values))
    .overrideProvider(CommandRunner)
    .useValue(runner)
    .overrideProvider(DockerService)
    .useValue(docker)
    .compile();

  const app = moduleRef.createNestApplication({ logger: false });

  configureApp(app);
  await app.init();

  return { app, runner, docker, config: values };
}
