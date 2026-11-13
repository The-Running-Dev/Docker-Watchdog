import { ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { describe, expect, it } from 'vitest';
import type { CommandResult } from '../docker/command-runner.service.js';
import { LogService } from '../logging/log.service.js';
import { capDetails, MAX_DETAILS_LENGTH, RestartExecutor, type RestartRequest } from './restart-executor.service.js';

/** A runner whose commands finish only when the test releases them. */
class GatedRunner {
  calls = 0;
  private readonly pending: (() => void)[] = [];

  run(): Promise<CommandResult> {
    this.calls++;

    return new Promise((resolve) => {
      this.pending.push(() => resolve({ code: 0, stdout: '', stderr: '' }));
    });
  }

  finishAll(): void {
    this.pending.splice(0).forEach((release) => release());
  }
}

const request: RestartRequest = {
  kind: 'project',
  target: 'web',
  steps: [{ step: 'up', args: ['compose', 'up', '-d'] }],
  dryRun: false,
  source: 'api',
};

function executor(runner: GatedRunner) {
  return new RestartExecutor(runner as never, new LogService(new EventEmitter2()), new EventEmitter2());
}

describe('RestartExecutor', () => {
  it('refuses a second restart of the same target while one runs, and frees the lock after', async () => {
    const runner = new GatedRunner();
    const restarts = executor(runner);

    const first = restarts.execute(request);

    expect(restarts.isRunning('project', 'web')).toBe(true);
    await expect(restarts.execute(request)).rejects.toBeInstanceOf(ConflictException);
    expect(runner.calls).toBe(1);

    runner.finishAll();
    expect((await first).success).toBe(true);
    expect(restarts.isRunning('project', 'web')).toBe(false);
  });

  it('runs different targets side by side', async () => {
    const runner = new GatedRunner();
    const restarts = executor(runner);

    const first = restarts.execute(request);
    const other = restarts.execute({ ...request, kind: 'container', target: 'web' });

    expect(runner.calls).toBe(2);
    runner.finishAll();
    expect((await Promise.all([first, other])).map((r) => r.success)).toEqual([true, true]);
  });

  it('keeps the tail of long output', () => {
    const capped = capDetails(`${'x'.repeat(MAX_DETAILS_LENGTH)}the error`);

    expect(capped.endsWith('the error')).toBe(true);
    expect(capped.length).toBe(MAX_DETAILS_LENGTH + 3);
  });
});
