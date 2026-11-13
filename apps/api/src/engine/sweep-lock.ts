import { Injectable } from '@nestjs/common';
import { sleep } from './engine-timings.js';

/**
 * Held by the updater for a whole run. The monitor waits for it, so it does not restart
 * containers the updater is in the middle of recreating.
 */
@Injectable()
export class SweepLock {
  private holder: string | null = null;

  get held(): boolean {
    return this.holder !== null;
  }

  get owner(): string | null {
    return this.holder;
  }

  tryAcquire(owner: string): boolean {
    if (this.holder !== null) return false;

    this.holder = owner;

    return true;
  }

  release(): void {
    this.holder = null;
  }

  /** True once the lock is free; false when it is still held after maxMs. */
  async waitUntilFree(maxMs: number, pollMs: number): Promise<boolean> {
    const deadline = Date.now() + maxMs;

    while (this.held) {
      if (Date.now() >= deadline) return false;

      await sleep(Math.min(pollMs, Math.max(0, deadline - Date.now())));
    }

    return true;
  }
}
