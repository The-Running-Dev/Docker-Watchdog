// hooks/useApi.ts

'use client';

import axios, { AxiosRequestHeaders } from 'axios';
import { Containers, Info, LogEntry, WebhookResponse } from '../../../shared/src/models';

export function useApi() {
    const getToken = (): string | null => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('token');
        }
        return null;
    };

    const getHeaders = (): AxiosRequestHeaders => {
        const token = getToken();
        
        return {
            Authorization: token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
        } as AxiosRequestHeaders;
    };

    const get = async <T>(endpoint: string): Promise<T> => {
        const response = await axios.get(endpoint, { headers: getHeaders() });
        
        return response.data as T;
    };

    const post = async <T>(endpoint: string, data: any): Promise<T> => {
        const response = await axios.post(endpoint, data, { headers: getHeaders() });
        
        return response.data as T;
    };

    return {
        get,
        post,
        getInfo: () => get<Info>('http://localhost:4000/docker/info'),
        getContainers: () => get<Containers[]>('http://localhost:4000/docker/containers'),
        getLogs: () => get<LogEntry[]>('http://localhost:4000/logs'),
        postWebhook: (data: any) => post<WebhookResponse>('http://localhost:4000/webhook', data),
        postUpdate: () => post('http://localhost:4000/update', {}),
    };
}
