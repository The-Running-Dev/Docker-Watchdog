// src/models/globalStore.ts

import { Containers, LogEntry } from 'container-manager-common';
import type { User } from '@/models';

export type GlobalStore = {
    logs: LogEntry[];
    
    containers: Containers[];
    
    status: string;
    
    user: User | null;

    addLog: (log: LogEntry) => void;

    clearLogs: () => void;

    setStatus: (status: string) => void;

    setUser: (user: User) => void;

    setContainers: (containers: Containers[]) => void;
    
    login: (user: User) => void;
    
    logout: () => void;
};