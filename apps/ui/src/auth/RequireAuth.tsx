import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { Loading, Unreachable } from '../components/Status';
import { useAuthStore } from '../store/auth';
import { useAuthStatus } from './useAuthStatus';

/** Shows children once the API says no sign-in is needed, or the user has signed in. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, error, retry } = useAuthStatus();
  const credential = useAuthStore((state) => state.credential);
  const location = useLocation();

  if (error) return <Unreachable onRetry={retry} />;
  if (!status) return <Loading label="Connecting to the API…" />;
  if (status.authEnabled && !credential) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return children;
}
