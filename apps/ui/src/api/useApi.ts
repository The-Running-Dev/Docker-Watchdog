import { useCallback, useEffect, useState } from 'react';
import { api } from './client';

export interface ApiQuery<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  reload: () => void;
}

/** GETs path on mount and on reload(); keeps the last data while reloading. */
export function useApi<T>(path: string): ApiQuery<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;

    api<T>(path)
      .then((result) => {
        if (!current) return;

        setData(result);
        setError(undefined);
      })
      .catch((reason: unknown) => {
        if (current) setError(reason instanceof Error ? reason : new Error(String(reason)));
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
    };
  }, [path, attempt]);

  const reload = useCallback(() => {
    setLoading(true);
    setAttempt((value) => value + 1);
  }, []);

  return { data, error, loading, reload };
}
