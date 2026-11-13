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
    const req = context.switchToHttp().getRequest();
    const apiKey = req.headers['x-api-key'];

    if (req.path === '/auth/login') return true;

    if (apiKey !== environment.apiKey) {
      throw new UnauthorizedException('Invalid API Key');
    }
    return true;
  }
}

export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const token = authHeader.split(' ')[1];

    try {
      req.user = jwt.verify(token, environment.jwtSecret);
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
