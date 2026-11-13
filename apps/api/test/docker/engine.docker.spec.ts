/**
 * The updater and the monitor against a real Docker engine: pnpm test:docker. Needs Docker with
 * compose and registry access. Touches only the watchdog-it project and the busybox:1.36.1 and
 * busybox:1.37.0 images; busybox:1.37.0 is re-tagged to the older image for the update and pulled
 * again afterwards. Any other command the app tries is refused, so containers that happen to be
 * unhealthy on the machine are left alone.
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import type { RestartEvent } from '@subzerodev/watchdog-shared';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { appConfigSchema } from '../../src/config/app-config.schema.js';
import { ConfigService } from '../../src/config/config.service.js';
import { CommandRunner, type CommandOptions, type CommandResult } from '../../src/docker/command-runner.service.js';
import { DockerService } from '../../src/docker/docker.service.js';
import { ENGINE_TIMINGS, type EngineTimings } from '../../src/engine/engine-timings.js';
import { UpdaterService } from '../../src/engine/updater.service.js';
import { WatchdogEvents } from '../../src/events.js';
import { tempTree } from '../helpers.js';

const PROJECT = 'watchdog-it';
const IMAGE = 'busybox:1.37.0';
const OLDER_IMAGE = 'busybox:1.36.1';
const WEB = 'watchdog-it-web';
const APP = 'watchdog-it-app';

const TIMINGS: EngineTimings = {
  settleMs: 1_000,
  updateHealthTimeoutMs: 60_000,
  monitorHealthTimeoutMs: 60_000,
  healthPollMs: 500,
  lockWaitMs: 60_000,
  lockPollMs: 500,
};

/** Runs only what this test expects the app to run. */
class FixtureRunner extends CommandRunner {
  constructor(private readonly projectDirectory: string) {
    super();
  }

  override run(file: string, args: string[], options: CommandOptions = {}): Promise<CommandResult> {
    const command = args.join(' ');
    const allowed =
      file === 'docker' &&
      (command === `pull ${IMAGE}` ||
        command === 'compose version' ||
        (args[0] === 'compose' && options.cwd !== undefined && resolve(options.cwd) === this.projectDirectory) ||
        (args[0] === 'restart' && [WEB, APP].includes(args[1] ?? '')));

    if (!allowed) return Promise.resolve({ code: 1, stdout: '', stderr: `Refused by the Docker test: ${command}` });

    return super.run(file, args, options);
  }
}

const shell = new CommandRunner();

async function docker(args: string[], cwd?: string): Promise<string> {
  const { code, stdout, stderr } = await shell.run('docker', args, { cwd });

  if (code !== 0) throw new Error(`docker ${args.join(' ')} failed: ${stderr}`);

  return stdout.trim();
}

const imageIdOf = (reference: string) => docker(['image', 'inspect', '--format', '{{.Id}}', reference]);
const startedAt = (name: string) => docker(['inspect', '--format', '{{.State.StartedAt}}', name]);

describe('With a real Docker engine', () => {
  const tree = tempTree({
    [`${PROJECT}/compose.yaml`]: readFileSync(new URL('./fixture/compose.yaml', import.meta.url), 'utf8'),
  });
  const projectDirectory = resolve(join(tree.root, PROJECT));
  let app: INestApplication;
  let latestId: string;
  let olderId: string;

  beforeAll(async () => {
    await docker(['pull', '--quiet', OLDER_IMAGE]);
    await docker(['pull', '--quiet', IMAGE]);
    latestId = await imageIdOf(IMAGE);
    olderId = await imageIdOf(OLDER_IMAGE);
    expect(olderId).not.toBe(latestId);

    // The project starts on an older image under the current tag, as if the tag moved upstream.
    await docker(['tag', OLDER_IMAGE, IMAGE]);
    await docker(['compose', 'up', '--detach', '--wait'], projectDirectory);

    const values = appConfigSchema.parse({
      ProjectsDirectory: tree.root,
      IncludeProjects: [PROJECT],
      ContainerDependencies: { [WEB]: [APP] },
      PruneAfterUpdate: false,
      UpdaterCronJob: false,
      UpdateOnStart: false,
    });
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService)
      .useValue(new ConfigService(values))
      .overrideProvider(CommandRunner)
      .useValue(new FixtureRunner(projectDirectory))
      .overrideProvider(ENGINE_TIMINGS)
      .useValue(TIMINGS)
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await docker(['compose', 'down', '--remove-orphans', '--timeout', '1'], projectDirectory).catch(() => {});
    // Put the tag back on the current image, should the update not have.
    await docker(['pull', '--quiet', IMAGE]).catch(() => {});
    tree.dispose();
  });

  const runningImage = async (name: string) => (await app.get(DockerService).containerImage(name))?.imageId;

  it('a dry run finds the update and changes nothing', async () => {
    const run = await app.get(UpdaterService).run('api', { dryRun: true });

    expect(run?.error).toBeUndefined();
    expect(run).toMatchObject({
      checked: 1,
      summary: ` - ${PROJECT}: 🧪 Update Available (Dry Run).`,
    });
    expect(await runningImage(WEB)).toBe(olderId);
  });

  it('an update pulls the image, recreates the project and waits for it to be healthy', async () => {
    const run = await app.get(UpdaterService).run('api', { dryRun: false });

    expect(run?.error).toBeUndefined();
    expect(run).toMatchObject({
      checked: 1,
      updated: [{ project: PROJECT, images: [IMAGE], success: true, unhealthy: [] }],
      summary: ` - ${PROJECT}: ✅ All Services Healthy.`,
    });
    expect(await runningImage(WEB)).toBe(latestId);
    expect(await runningImage(APP)).toBe(latestId);
    expect(await app.get(DockerService).containerHealth(WEB)).toBe('healthy');
  });

  it('the monitor restarts an unhealthy container, then its dependents', async () => {
    const restarts: RestartEvent[] = [];
    const appStartedAt = await startedAt(APP);

    app.get(EventEmitter2).on(WatchdogEvents.Restart, (event: RestartEvent) => restarts.push(event));

    // The health check fails without /tmp/ok; the container's command creates it again on restart.
    await docker(['exec', WEB, 'rm', '/tmp/ok']);

    await vi.waitFor(
      () => expect(restarts.filter((e) => e.source === 'monitor').map((e) => e.target)).toEqual([WEB, APP]),
      { timeout: 90_000, interval: 500 },
    );
    expect(restarts.every((e) => e.success)).toBe(true);
    expect(await startedAt(APP)).not.toBe(appStartedAt);
    await vi.waitFor(async () => expect(await app.get(DockerService).containerHealth(WEB)).toBe('healthy'), {
      timeout: 30_000,
      interval: 500,
    });
  });
});
