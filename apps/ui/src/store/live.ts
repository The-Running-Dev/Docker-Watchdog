import type { Containers, LogEntry, UpdaterStatus } from '@subzerodev/watchdog-shared';
import { create } from 'zustand';

/** The API keeps the last 1000 entries; the UI keeps as many. */
export const MAX_LOGS = 1000;

const logKey = (entry: LogEntry) => `${entry.timestamp}|${entry.level}|${entry.message}`;

interface LiveState {
  /** True while the socket is connected. */
  connected: boolean;
  /** Null until GET /api/projects answers. */
  projects: Containers[] | null;
  /** Newest first. */
  logs: LogEntry[];
  updater: UpdaterStatus | null;
  setConnected: (connected: boolean) => void;
  setProjects: (projects: Containers[]) => void;
  /** Adds entries (from a page or the socket), dropping ones already shown, newest first. */
  addLogs: (entries: LogEntry[]) => void;
  setUpdater: (status: UpdaterStatus) => void;
  reset: () => void;
}

const initial = { connected: false, projects: null, logs: [], updater: null };

export const useLiveStore = create<LiveState>()((set) => ({
  ...initial,
  setConnected: (connected) => set({ connected }),
  setProjects: (projects) => set({ projects }),
  addLogs: (entries) =>
    set((state) => {
      const seen = new Set(state.logs.map(logKey));
      const added = entries.filter((entry) => {
        const key = logKey(entry);

        if (seen.has(key)) return false;

        seen.add(key);

        return true;
      });

      if (added.length === 0) return {};

      const logs = [...state.logs, ...added].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      return { logs: logs.slice(0, MAX_LOGS) };
    }),
  setUpdater: (updater) => set({ updater }),
  reset: () => set(initial),
}));
