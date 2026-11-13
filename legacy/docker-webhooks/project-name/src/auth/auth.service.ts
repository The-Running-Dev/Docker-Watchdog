// src/auth/auth.service.ts

import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { environment } from '../config/environment';

@Injectable()
export class AuthService {
    validate(username: string, password: string): boolean {
        return username === environment.adminUser
            && password === environment.adminPassword;
    }

    generateToken(username: string) {
        return jwt.sign({ username }, environment.jwtSecret);
    }
}
