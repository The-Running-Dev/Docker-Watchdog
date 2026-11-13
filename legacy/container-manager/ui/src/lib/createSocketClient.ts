import { io, Socket } from 'socket.io-client';

export const createSocketClient = (
    onEvent?: (event: string, data: any) => void,
    withAuth: boolean = false
): Socket => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : undefined;

    const socket = io(process.env.NEXT_PUBLIC_API_WS_URL || 'http://localhost:4000', {
        transports: ['websocket'],
        auth: withAuth && token ? { token } : undefined,
    });

    socket.onAny((event, data) => {
        onEvent?.(event, data);
    });

    return socket;
};
