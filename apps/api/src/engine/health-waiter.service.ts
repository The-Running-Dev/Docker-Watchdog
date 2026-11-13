import { Inject, Injectable } from '@nestjs/common';
import { DockerService, HEALTHY_STATES } from '../docker/docker.service.js';
import { ENGINE_TIMINGS, sleep, type EngineTimings } from './engine-timings.js';

@Injectable()
export class HealthWaiter {
  constructor(
    private readonly docker: DockerService,
    @Inject(ENGINE_TIMINGS) private readonly timings: EngineTimings,
  ) {}

  /**
   * Polls until every container is healthy, or running when it has no health check.
   * Returns the containers that still are not once timeoutMs is up; empty means all are.
   */
  async waitFor(names: string[], timeoutMs: number): Promise<string[]> {
    const deadline = Date.now() + timeoutMs;
    let pending = [...names];

    for (;;) {
      const states = await Promise.all(pending.map((name) => this.docker.containerHealth(name)));

      pending = pending.filter((_, index) => !HEALTHY_STATES.has(states[index] ?? ''));

      if (!pending.length || Date.now() >= deadline) return pending;

      await sleep(Math.min(this.timings.healthPollMs, Math.max(0, deadline - Date.now())));
    }
  }
}
