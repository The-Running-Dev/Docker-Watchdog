// src/hooks/useApi.ts

'use client';

import { useEffect, useRef } from 'react';
import { createSocketClient } from '@/lib/createSocketClient';
import { useGlobalStore } from '@/store/useGlobalStore';
import axios, { AxiosRequestHeaders } from 'axios';
import {
    Containers,
    Info,
    LogEntry,
    WebhookResponse,
} from 'container-manager-common';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function useApi() {
    const socketRef = useRef<ReturnType<typeof createSocketClient> | null>(null);
    const { user, addLog, setStatus } = useGlobalStore();

    const getHeaders = (): AxiosRequestHeaders => {
        return {
            Authorization: user?.token ? `Bearer ${user.token}` : '',
            'Content-Type': 'application/json',
        } as AxiosRequestHeaders;
    };

    const get = async <T>(endpoint: string): Promise<T> => {
        const res = await axios.get(`${API_URL}${endpoint}`, { headers: getHeaders() });
        
        return res.data as T;
    };

    const post = async <T>(endpoint: string, data: any): Promise<T> => {
        const res = await axios.post(`${API_URL}${endpoint}`, data, { headers: getHeaders() });
        
        return res.data as T;
    };

    const connectSocket = () => {
        if (!user || socketRef.current?.connected) {
            return;
        }

        socketRef.current = createSocketClient((event, data) => {
            switch (event) {
                case 'log-event':
                    addLog(data);
                    
                    break;
                case 'container-event':
                    // addContainer(data);

                    break;
                case 'status-update':
                    setStatus(data);
                    
                    break;
            }
        }, true);
    };

    useEffect(() => {
        if (user) {
            connectSocket();
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [user]);

    return {
        get,
        post,
        getInfo: () => get<Info>('/docker/info'),
        getContainers: () => get<Containers[]>('/docker/containers'),
        getLogs: (page = 1) => get<{ data: LogEntry[] }>(`/logs?page=${page}&limit=100`),
        postWebhook: (data: any) => post<WebhookResponse>('/webhook', data),
        postUpdate: () => post('/update', {}),
        connectSocket,
        socket: socketRef.current,
    };
}