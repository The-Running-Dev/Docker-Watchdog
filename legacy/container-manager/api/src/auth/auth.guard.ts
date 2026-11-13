// src/auth/auth.guard.ts

import * as jwt from 'jsonwebtoken';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { environment } from '../config/environment';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const apiKey = request.headers['x-api-key'];
    const authHeader = request.headers['authorization'];
    
    if (request.path === '/auth/login') {
      return true;
    }

    if (!authHeader && !apiKey) {
      return response.status(401).send('Authorization Header Missing');
    }

    if (apiKey) {
      if (apiKey !== environment.apiKey) {
        throw new UnauthorizedException('Invalid API Key');
      }

      return true;
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return response.status(401).send('Token Missing');
    }

    try {
      request.user = jwt.verify(token, environment.jwtSecret);
      
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}