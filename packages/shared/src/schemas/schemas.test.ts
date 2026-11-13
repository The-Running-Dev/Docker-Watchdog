import { describe, expect, it } from 'vitest';
import { WebhookEvent } from '../models/index.js';
import { restartProjectRequestSchema } from './restart-project-request.schema.js';
import { webhookRequestSchema } from './webhook-request.schema.js';

describe('webhookRequestSchema', () => {
  it('fills defaults, keeping deleteVolumes off unless asked for', () => {
    const parsed = webhookRequestSchema.parse({
      event: 'update-project',
      data: { projectOrContainerId: 'media' },
    });

    expect(parsed).toEqual({
      event: WebhookEvent.UpdateProject,
      data: { projectOrContainerId: 'media', hardReset: false, deleteVolumes: false, isTest: false },
    });
  });

  it('rejects an unknown event', () => {
    expect(webhookRequestSchema.safeParse({ event: 'nuke', data: { projectOrContainerId: 'x' } }).success).toBe(false);
  });

  it('rejects a blank id', () => {
    expect(
      webhookRequestSchema.safeParse({ event: 'update-container', data: { projectOrContainerId: '  ' } }).success,
    ).toBe(false);
  });
});

describe('restartProjectRequestSchema', () => {
  it('accepts a single option string and normalises it to a list', () => {
    const parsed = restartProjectRequestSchema.parse({
      event: 'update-project',
      data: { projectId: 'media', additionalArgs: '--remove-orphans' },
    });

    expect(parsed.data).toEqual({ projectId: 'media', additionalArgs: ['--remove-orphans'], isTest: false });
  });

  it('defaults additionalArgs to an empty list', () => {
    const parsed = restartProjectRequestSchema.parse({ event: 'update-project', data: { projectId: 'media' } });

    expect(parsed.data.additionalArgs).toEqual([]);
  });

  it('rejects arguments that are not options', () => {
    const result = restartProjectRequestSchema.safeParse({
      event: 'update-project',
      data: { projectId: 'media', additionalArgs: ['--pull', 'always; rm -rf /'] },
    });

    expect(result.success).toBe(false);
  });

  it('rejects other events', () => {
    expect(restartProjectRequestSchema.safeParse({ event: 'update-container', data: { projectId: 'x' } }).success).toBe(
      false,
    );
  });
});
