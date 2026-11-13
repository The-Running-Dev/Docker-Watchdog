import { describe, expect, it } from 'vitest';
import { WebhookEvent } from '../models/index.js';
import { containerRestartOptionsSchema, projectRestartOptionsSchema } from './restart-options.schema.js';
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

  it('rejects deleteVolumes without hardReset', () => {
    expect(
      webhookRequestSchema.safeParse({
        event: 'update-project',
        data: { projectOrContainerId: 'media', deleteVolumes: true },
      }).success,
    ).toBe(false);
  });
});

describe('projectRestartOptionsSchema', () => {
  it('defaults to a pull and a plain restart', () => {
    expect(projectRestartOptionsSchema.parse({})).toEqual({
      pull: true,
      hardReset: false,
      deleteVolumes: false,
      dryRun: false,
    });
  });

  it('only allows deleteVolumes with hardReset', () => {
    expect(projectRestartOptionsSchema.safeParse({ deleteVolumes: true }).success).toBe(false);
    expect(projectRestartOptionsSchema.safeParse({ deleteVolumes: true, hardReset: true }).success).toBe(true);
  });

  it('rejects additional arguments that are not options', () => {
    expect(projectRestartOptionsSchema.safeParse({ additionalArgs: ['--remove-orphans', 'rm'] }).success).toBe(false);
  });
});

describe('containerRestartOptionsSchema', () => {
  it('defaults to recreating without a pull', () => {
    expect(containerRestartOptionsSchema.parse({})).toEqual({ mode: 'recreate', pull: false, dryRun: false });
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

  it('treats null additionalArgs as none, like the Flask route', () => {
    const parsed = restartProjectRequestSchema.parse({
      event: 'update-project',
      data: { projectId: 'media', additionalArgs: null },
    });

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
