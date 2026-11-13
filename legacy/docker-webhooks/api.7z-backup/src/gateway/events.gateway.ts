// src/gateway/events.gateway.ts

import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    WebSocketServer,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';

@Injectable()
@WebSocketGateway({ cors: true }) // you can also pass port, namespace, etc.
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server | undefined;

    afterInit(_server: Server) {
        console.log('Socket.IO Server Initialized');
    }

    handleConnection(client: Socket) {
        console.log(`Client Connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client Disconnected: ${client.id}`);
    }

    @SubscribeMessage('message')
    handleMessage(@MessageBody() data: any): string {
        console.log('Received Message:', data);
        
        return 'Hello from server!';
    }

    sendCustomEvent(eventType: string, payload: any) {
        this.server?.emit(eventType, payload);
    }
}