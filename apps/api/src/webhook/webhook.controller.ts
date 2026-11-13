import { Body, Controller, HttpCode, HttpException, HttpStatus, NotFoundException, Post } from '@nestjs/common';
import {
  WebhookEvent,
  webhookRequestSchema,
  type RestartResult,
  type WebhookResponse,
} from '@subzerodev/watchdog-shared';
import { parseBody } from '../common/parse-body.js';
import { ContainersService } from '../containers/containers.service.js';
import { ProjectsService } from '../projects/projects.service.js';

/** CI and registry hooks: pull and redeploy a project, or recreate a single container. */
@Controller('webhook')
export class WebhookController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly containers: ContainersService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(@Body() body: unknown): Promise<WebhookResponse> {
    const { event, data } = parseBody(webhookRequestSchema, body);
    const id = data.projectOrContainerId;

    let result: RestartResult;

    try {
      result =
        event === WebhookEvent.UpdateProject
          ? await this.projects.restart(
              id,
              { pull: true, hardReset: data.hardReset, deleteVolumes: data.deleteVolumes, dryRun: data.isTest },
              'webhook',
            )
          : await this.containers.restart(id, { mode: 'recreate', pull: true, dryRun: data.isTest }, 'webhook');
    } catch (error) {
      if (error instanceof NotFoundException) {
        const response: WebhookResponse = { success: false, message: error.message, projectOrContainerId: id };

        throw new HttpException(response, HttpStatus.NOT_FOUND);
      }

      throw error;
    }

    const response: WebhookResponse = {
      success: result.success,
      message: result.message,
      details: result.details ?? result.commands.join('\n'),
      projectOrContainerId: id,
    };

    if (!result.success) throw new HttpException(response, HttpStatus.INTERNAL_SERVER_ERROR);

    return response;
  }
}
