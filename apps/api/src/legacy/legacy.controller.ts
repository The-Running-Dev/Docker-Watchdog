import { Body, Controller, HttpCode, HttpException, HttpStatus, NotFoundException, Post } from '@nestjs/common';
import { restartProjectRequestSchema } from '@subzerodev/watchdog-shared';
import type { z } from 'zod';
import { ContainersService } from '../containers/containers.service.js';
import { LogService } from '../logging/log.service.js';
import { ProjectsService } from '../projects/projects.service.js';

type Body = Record<string, unknown>;

/**
 * The routes the Flask API served, with the same request and response bodies, so Uptime Kuma
 * and existing CI jobs keep working. New callers use /api/webhook and /api/projects.
 */
@Controller()
export class LegacyController {
  constructor(
    private readonly containers: ContainersService,
    private readonly projects: ProjectsService,
    private readonly log: LogService,
  ) {}

  /** Uptime Kuma webhook: restarts the container when its monitor goes down (status 0). */
  @Post('restart')
  @HttpCode(HttpStatus.OK)
  async restart(@Body() data: unknown): Promise<Body> {
    if (!isObject(data) || Object.keys(data).length === 0) {
      this.log.warn('No JSON payload received');

      throw reply(HttpStatus.BAD_REQUEST, { error: 'No JSON Received' });
    }

    const { monitor, heartbeat } = data;

    // Uptime Kuma's "test" notification has neither; answer like /health.
    if (monitor == null && heartbeat == null) return { status: 'healthy' };

    if (monitor == null) throw reply(HttpStatus.BAD_REQUEST, { error: "No 'monitor' Object in Payload" });

    if (heartbeat == null) throw reply(HttpStatus.BAD_REQUEST, { error: "No 'heartbeat' Object in Payload" });

    const monitorBody = isObject(monitor) ? monitor : {};
    const heartbeatBody = isObject(heartbeat) ? heartbeat : {};
    const description = text(monitorBody.description);
    const container = description?.startsWith('container-')
      ? description.slice('container-'.length)
      : text(monitorBody.name);

    if (!container) throw reply(HttpStatus.BAD_REQUEST, { error: 'No Container Name Found' });

    const status = heartbeatBody.status;

    if (status !== 0) return { message: `Ignored ${container}, Status: ${status ?? 'None'}` };

    try {
      const result = await this.containers.restart(
        container,
        { mode: 'restart', pull: false, dryRun: false },
        'uptime-kuma',
        {
          monitor: { name: text(monitorBody.name) ?? container, url: text(monitorBody.url) },
          timeZone: text(heartbeatBody.timezone),
        },
      );

      if (!result.success) {
        throw reply(HttpStatus.INTERNAL_SERVER_ERROR, { error: 'failed', details: result.details ?? '', container });
      }

      return { status: `${container} Restarted` };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw reply(HttpStatus.NOT_FOUND, {
          error: 'container_not_found',
          details: `Container '${container}' Not Found`,
          container,
        });
      }

      throw error;
    }
  }

  /** CI webhook: pulls a compose project and brings it up with the given `up` options. */
  @Post('restart-project')
  @HttpCode(HttpStatus.OK)
  async restartProject(@Body() body: unknown): Promise<Body> {
    const parsed = restartProjectRequestSchema.safeParse(body ?? {});

    if (!parsed.success) {
      const error = legacyValidationError(parsed.error.issues);

      this.log.warn(error);

      throw reply(HttpStatus.BAD_REQUEST, { error });
    }

    const { projectId: name, additionalArgs, isTest } = parsed.data.data;

    try {
      const result = await this.projects.restart(
        name,
        { pull: true, hardReset: false, deleteVolumes: false, dryRun: isTest, additionalArgs },
        'restart-project',
      );

      if (isTest) {
        const project = await this.projects.locate(name);

        return {
          status: `Test Mode: Would Restart Project '${name}' in ${project?.directory} (additionalArgs=${JSON.stringify(additionalArgs)})`,
        };
      }

      if (!result.success) {
        const error = result.failedStep === 'pull' ? 'Docker Compose Pull Failed' : 'Docker Compose Up Failed';

        throw reply(HttpStatus.INTERNAL_SERVER_ERROR, { error, details: result.details ?? '' });
      }

      return { status: `Project '${name}' Restarted Successfully.`, additionalArgs };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw reply(HttpStatus.NOT_FOUND, {
          error: 'project_not_found',
          details: `No Compose File Found for Project '${name}' in ${this.projects.projectsDirectory}`,
        });
      }

      throw error;
    }
  }
}

/** The first problem the Flask route would have reported, in its words. */
export function legacyValidationError(issues: z.core.$ZodIssue[]): string {
  const at = (field: string) => issues.some((issue) => issue.path[0] === 'data' && issue.path[1] === field);
  const envelope = issues.some((issue) => issue.path.length < 2);

  if (envelope) return "Invalid Payload: Missing 'event' or 'data' Field.";
  if (at('projectId')) return "No 'projectId' Provided in Payload.";
  if (at('additionalArgs')) return "Invalid 'additionalArgs': Expected a List of Options for 'docker compose up'.";

  return "Invalid Payload: Missing 'event' or 'data' Field.";
}

function reply(status: HttpStatus, body: Body): HttpException {
  return new HttpException(body, status);
}

function isObject(value: unknown): value is Body {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}
