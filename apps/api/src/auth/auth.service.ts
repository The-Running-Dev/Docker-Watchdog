import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '../config/config.service.js';
import { LogService } from '../logging/log.service.js';

export interface Credentials {
  apiKey?: string;
  /** A login token, without the "Bearer " prefix. */
  token?: string;
}

/**
 * Auth is off unless ApiKey or AdminUser + AdminPassword are set. When on, a request
 * needs either the API key or a token from POST /api/auth/login.
 */
@Injectable()
export class AuthService {
  private readonly jwt: JwtService;

  constructor(
    private readonly config: ConfigService,
    log: LogService,
  ) {
    const { JwtSecret, JwtExpiresIn } = config.values;

    if (config.loginEnabled && !JwtSecret) {
      log.warn('JwtSecret is not set; using a random one, so logins end when the service restarts.');
    }

    this.jwt = new JwtService({
      secret: JwtSecret || randomBytes(32).toString('hex'),
      signOptions: { expiresIn: JwtExpiresIn as `${number}` },
    });
  }

  get enabled(): boolean {
    return this.config.authEnabled;
  }

  get loginEnabled(): boolean {
    return this.config.loginEnabled;
  }

  get tokenLifetime(): string {
    return this.config.values.JwtExpiresIn;
  }

  /** A signed token for valid admin credentials, otherwise null. */
  login(username: string, password: string): string | null {
    if (!this.loginEnabled) return null;

    // Compare both, always, so the timing says nothing about which one was wrong.
    const userMatches = safeEqual(username, this.config.values.AdminUser);
    const passwordMatches = safeEqual(password, this.config.values.AdminPassword);

    return userMatches && passwordMatches ? this.jwt.sign({ sub: username }) : null;
  }

  authenticate({ apiKey, token }: Credentials): boolean {
    if (!this.enabled) return true;

    if (apiKey && this.config.values.ApiKey && safeEqual(apiKey, this.config.values.ApiKey)) return true;

    if (token && this.loginEnabled) {
      try {
        this.jwt.verify(token);

        return true;
      } catch {
        return false;
      }
    }

    return false;
  }
}

function safeEqual(a: string, b: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest();

  return timingSafeEqual(digest(a), digest(b));
}
