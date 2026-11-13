import type { AuthStatus } from '@subzerodev/watchdog-shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** How the UI authenticates: a login token (Bearer) or the API key (x-api-key). */
export type Credential = { kind: 'token'; token: string; username: string } | { kind: 'apiKey'; apiKey: string };

interface AuthState {
  credential: Credential | null;
  /** From GET /api/auth/status; null until it answers. Not persisted. */
  status: AuthStatus | null;
  signIn: (credential: Credential) => void;
  signOut: () => void;
  setStatus: (status: AuthStatus) => void;
}

/** localStorage that never throws: private windows and blocked storage just keep nothing. */
const safeLocalStorage = {
  getItem: (name: string) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // Not stored: the user signs in again next time.
    }
  },
  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // Nothing to remove.
    }
  },
};

export const AUTH_STORAGE_KEY = 'watchdog-auth';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      credential: null,
      status: null,
      signIn: (credential) => set({ credential }),
      signOut: () => set({ credential: null }),
      setStatus: (status) => set({ status }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (state) => ({ credential: state.credential }),
    },
  ),
);
