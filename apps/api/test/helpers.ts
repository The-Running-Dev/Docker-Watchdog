import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { INestApplication, type ModuleMetadata } from '@nestjs/common';
import { AbstractLoader, ExpressLoader } from '@nestjs/serve-static';
import { Test } from '@nestjs/testing';
import { groupByProject } from '../src/docker/docker.service.js';
import type { Containers, DockerContainer } from '@subzerodev/watchdog-shared';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { appConfigSchema, type AppConfig } from '../src/config/app-config.schema.js';
import { ConfigService } from '../src/config/config.service.js';
import { CommandRunner, type CommandOptions, type CommandResult } from '../src/docker/command-runner.service.js';
import {
  COMPOSE_WORKING_DIR_LABEL,
  DockerService,
  splitImage,
  type ContainerImage,
} from '../src/docker/docker.service.js';
import { ENGINE_TIMINGS, type EngineTimings } from '../src/engine/engine-timings.js';
import { PreflightService } from '../src/engine/preflight.service.js';

/** Short waits, so health and lock waits finish within a test. */
export const TEST_TIMINGS: EngineTimings = {
  settleMs: 0,
  updateHealthTimeoutMs: 100,
  monitorHealthTimeoutMs: 100,
  healthPollMs: 10,
  lockWaitMs: 200,
  lockPollMs: 10,
};

export interface RunnerCall {
  file: string;
  args: string[];
  cwd?: string;
}

/** Records every command; answers with queued results, else onRun's answer, else success. */
export class FakeRunner {
  readonly calls: RunnerCall[] = [];
  private readonly results: CommandResult[] = [];
  /** Side effects and answers by command, e.g. a pull that adds an image to FakeDocker. */
  onRun?: (call: RunnerCall) => CommandResult | void;

  failNext(stderr: string, code = 1): this {
    this.results.push({ code, stdout: '', stderr });

    return this;
  }

  async run(file: string, args: string[], options: CommandOptions = {}): Promise<CommandResult> {
    const call = { file, args, cwd: options.cwd };

    this.calls.push(call);

    return this.results.shift() ?? this.onRun?.(call) ?? { code: 0, stdout: '', stderr: '' };
  }
}

export const OLD_IMAGE = 'sha256:old';

export class FakeDocker {
  containers: DockerContainer[] = [];
  engineVersion: string | null = '29.0.0';
  /** Local images by reference. */
  images: Record<string, string> = {};
  /** Health (or state) by container name; the container's State when not set. */
  health: Record<string, string> = {};
  /** References the registry has a newer image for. */
  newerInRegistry = new Set<string>();

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

  /** Every container runs OLD_IMAGE, created from Image:Version. */
  async containerImage(id: string): Promise<ContainerImage | null> {
    const found = this.containers.find((c) => c.Id === id);

    if (!found) return null;

    return { reference: found.Version ? `${found.Image}:${found.Version}` : found.Image, imageId: OLD_IMAGE };
  }

  async containerHealth(name: string): Promise<string | null> {
    return this.health[name] ?? (await this.findContainer(name))?.State ?? null;
  }

  async imageId(reference: string): Promise<string | null> {
    return this.images[reference] ?? null;
  }

  async hasNewerImage(reference: string): Promise<boolean> {
    return this.newerInRegistry.has(reference);
  }
}

export function container(
  name: string,
  compose?: { project: string; service: string; workingDir?: string },
  image = 'nginx:latest',
): DockerContainer {
  const labels: Record<string, string> = compose
    ? {
        'com.docker.compose.project': compose.project,
        'com.docker.compose.service': compose.service,
        ...(compose.workingDir ? { [COMPOSE_WORKING_DIR_LABEL]: compose.workingDir } : {}),
      }
    : {};

  const { image: repository, version } = splitImage(image);

  return {
    Id: `id-${name}`,
    Name: name,
    Image: repository,
    Version: version,
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

export async function createTestApp(
  config: Partial<Record<keyof AppConfig, unknown>> = {},
  imports: NonNullable<ModuleMetadata['imports']> = [],
): Promise<TestApp> {
  const runner = new FakeRunner();
  const docker = new FakeDocker();
  // No schedule and no update at startup unless a test asks for them. The default /projects
  // can be a real, large directory on a developer machine (D:\Projects on Windows).
  const values = appConfigSchema.parse({
    UpdaterCronJob: false,
    UpdateOnStart: false,
    ProjectsDirectory: join(tmpdir(), 'watchdog-no-projects'),
    ...config,
  });

  const moduleRef = await Test.createTestingModule({ imports: [AppModule, ...imports] })
    .overrideProvider(ConfigService)
    .useValue(new ConfigService(values))
    .overrideProvider(CommandRunner)
    .useValue(runner)
    .overrideProvider(DockerService)
    .useValue(docker)
    .overrideProvider(ENGINE_TIMINGS)
    .useValue(TEST_TIMINGS)
    // serve-static picks its loader from the HTTP adapter, which a testing module only gets
    // after compile(); NestFactory.create has it from the start.
    .overrideProvider(AbstractLoader)
    .useValue(new ExpressLoader())
    .compile();

  const app = moduleRef.createNestApplication({ logger: false });

  configureApp(app);

  // The updater starts a preflight check in the background at bootstrap; wait for it, so its
  // `docker compose version` call cannot land in the first test's recorded commands.
  const preflight = moduleRef.get(PreflightService);
  const check = preflight.check.bind(preflight);
  const checks: Promise<boolean>[] = [];

  preflight.check = () => {
    const result = check();

    checks.push(result);

    return result;
  };

  await app.init();
  await Promise.all(checks);

  return { app, runner, docker, config: values };
}
