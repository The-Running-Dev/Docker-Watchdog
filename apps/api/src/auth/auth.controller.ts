import { Body, Controller, Get, HttpCode, NotFoundException, Post, UnauthorizedException } from '@nestjs/common';
import { loginRequestSchema, type LoginResponse } from '@subzerodev/watchdog-shared';
import { parseBody } from '../common/parse-body.js';
import { LogService } from '../logging/log.service.js';
import { AuthService } from './auth.service.js';
import { Public } from './public.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly log: LogService,
  ) {}

  /** Lets the UI decide whether to show the login page. */
  @Public()
  @Get('status')
  status(): { authEnabled: boolean; loginEnabled: boolean } {
    return { authEnabled: this.auth.enabled, loginEnabled: this.auth.loginEnabled };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() body: unknown): LoginResponse {
    if (!this.auth.loginEnabled) throw new NotFoundException('Login is not configured');

    const { username, password } = parseBody(loginRequestSchema, body);
    const token = this.auth.login(username, password);

    if (!token) {
      this.log.warn(`Failed login for '${username}'`);

      throw new UnauthorizedException('Invalid credentials');
    }

    this.log.info(`'${username}' logged in`);

    return { username, token, expiresIn: this.auth.tokenLifetime };
  }
}
