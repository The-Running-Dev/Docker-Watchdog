// src/hooks/useSocket.ts

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
    onConnect?: () => void;
    onDisconnect?: () => void;
    onMessage?: (data: any) => void;
    onEvent?: (event: string, data: any) => void;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_API_WS_URL || 'http://localhost:4000';

export const useSocket = (options?: UseSocketOptions) => {
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        const socket = io(SOCKET_URL, {
            transports: ['websocket'],
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('✅ WebSocket Connected');
            
            options?.onConnect?.();
        });

        socket.on('disconnect', () => {
            console.log('❌ WebSocket Disconnected');
            
            options?.onDisconnect?.();
        });

        socket.on('message', (data) => {
            console.log('💬 Incoming Message:', data);
            
            options?.onMessage?.(data);
        });

        // General event catcher (e.g. logs, updates, notifications)
        socket.onAny((event, data) => {
            if (event !== 'message') {
                //console.log(`📡 [${event}]`, data);
                
                options?.onEvent?.(event, data);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const send = useCallback((event: string, payload: any) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit(event, payload);
        } else {
            console.warn('⚠️ WebSocket not Connected Yet.');
        }
    }, []);

    return { send };
};
