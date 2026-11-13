import type { AuthStatus } from '@subzerodev/watchdog-shared';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';

/** GET /api/auth/status, once per page load; retry() asks again after an error. */
export function useAuthStatus(): { status: AuthStatus | null; error: boolean; retry: () => void } {
  const status = useAuthStore((state) => state.status);
  const setStatus = useAuthStore((state) => state.setStatus);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (status) return;

    let current = true;

    api<AuthStatus>('/api/auth/status', { credential: null })
      .then((result) => current && setStatus(result))
      .catch(() => current && setError(true));

    return () => {
      current = false;
    };
  }, [status, setStatus, attempt]);

  const retry = useCallback(() => {
    setError(false);
    setAttempt((value) => value + 1);
  }, []);

  return { status, error, retry };
}
