import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { environment } from '../config/environment';

export const apiKeyAndTokenAuth = (apiKey: string) => {
    return (request: Request, response: Response, next: NextFunction) => {
        const apiKeyHeader = request.headers['x-api-key'];
        const authHeader = request.headers['authorization'];

        if (apiKeyHeader === apiKey) {
            return next();
        }

        if (!authHeader) {
            return response.status(401).send('Authorization Header Missing');
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return response.status(401).send('Token Missing');
        }

        jwt.verify(token, environment.jwtSecret, (err, user) => {
            if (err) {
                return response.status(403).send('Invalid Token');
            }

            (request as any).user = user;

            next();
        });
    };
};