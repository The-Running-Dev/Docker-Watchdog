import { describe, expect, it } from 'vitest';
import { SweepLock } from './sweep-lock.js';

describe('SweepLock', () => {
  it('has one holder at a time', () => {
    const lock = new SweepLock();

    expect(lock.tryAcquire('updater')).toBe(true);
    expect(lock.tryAcquire('other')).toBe(false);
    expect(lock).toMatchObject({ held: true, owner: 'updater' });

    lock.release();

    expect(lock).toMatchObject({ held: false, owner: null });
    expect(lock.tryAcquire('other')).toBe(true);
  });

  it('waits until it is released', async () => {
    const lock = new SweepLock();

    lock.tryAcquire('updater');
    setTimeout(() => lock.release(), 20);

    await expect(lock.waitUntilFree(1_000, 5)).resolves.toBe(true);
  });

  it('gives up once the wait is over', async () => {
    const lock = new SweepLock();

    lock.tryAcquire('updater');

    await expect(lock.waitUntilFree(30, 5)).resolves.toBe(false);
    await expect(new SweepLock().waitUntilFree(0, 5)).resolves.toBe(true);
  });
});
