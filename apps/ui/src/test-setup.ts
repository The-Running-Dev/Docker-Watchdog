import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

vi.mock('socket.io-client', async () => {
  const { fakeSocket } = await import('./test-socket');

  return { io: vi.fn(() => fakeSocket) };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
