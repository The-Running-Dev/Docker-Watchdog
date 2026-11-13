// src/store/useGlobalStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GlobalStore } from '@/models/globalStore';
import { Containers } from 'container-manager-common';

export const useGlobalStore = create<GlobalStore>()(
    persist(
        (set) => ({
            logs: [],
            containers: [],
            status: 'Disconnected',
            user: null,

            addLog: (log) =>
                set((state) => {
                    const exists = state.logs.some(
                        (l) => l.timestamp === log.timestamp && l.message === log.message
                    );
                    
                    if (exists) {
                        return {};
                    }
                    
                    return {
                        logs: [...state.logs.slice(-499), log]
                    };
                }),

            clearLogs: () => set({logs: []}),

            setStatus: (status) => set({status}),

            setUser: (user) => set({user}),

            setContainers: (containers: Containers[]) => set({ containers }),

            login: (user) => {
                set({user});
            },

            logout: () => {
                set({user: null, logs: [], status: 'Disconnected'});
            }
        }),
        {
            name: 'session-storage' // localStorage key
        }
    )
);
