import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { IS_PUBLIC } from './public.decorator.js';

/** Applied to every HTTP route (APP_GUARD). Socket.io connections are checked on the handshake. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.auth.enabled || context.getType() !== 'http') return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();

    if (this.auth.authenticate(credentialsFrom(request.headers))) return true;

    throw new UnauthorizedException('A valid API key or login token is required');
  }
}

export function credentialsFrom(headers: Record<string, string | string[] | undefined>): {
  apiKey?: string;
  token?: string;
} {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const authorization = first(headers.authorization);
  const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];

  return { apiKey: first(headers['x-api-key']), token };
}
