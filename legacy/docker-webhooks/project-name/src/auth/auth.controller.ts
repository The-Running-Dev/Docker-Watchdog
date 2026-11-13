// src/auth/auth.controller.ts

import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {
    }

    @Post('login')
    login(@Body() body: { username: string; password: string }) {
        const {username, password} = body;

        if (!this.authService.validate(username, password)) {
            throw new UnauthorizedException('Invalid Credentials');
        }

        return {username, token: this.authService.generateToken(username)};
    }
}