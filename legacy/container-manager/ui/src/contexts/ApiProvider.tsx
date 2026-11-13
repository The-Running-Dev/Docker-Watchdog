// src/contexts/ApiProvider.tsx

'use client';

import { createContext, useContext, useEffect, useMemo } from 'react';
import { useGlobalStore } from '@/store/useGlobalStore';
import { useApi } from '@/hooks/useApi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type ApiContextType = ReturnType<typeof useApi>;

const ApiContext = createContext<ApiContextType | null>(null);

export const ApiProvider = ({ children }: { children: React.ReactNode }) => {
    const store = useGlobalStore.getState();
    const api = useApi();

    // Optional: auto reconnect on load
    useEffect(() => {
        if (store.user && !api.socket?.connected) {
            api.connectSocket();
        }
    }, []);

    return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
};

export const useApiContext = () => {
    const context = useContext(ApiContext);
    if (!context) {
        throw new Error('useApiContext must be used inside <ApiProvider>');
    }

    return context;
};
