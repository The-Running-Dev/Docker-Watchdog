// src/index.ts

import 'reflect-metadata';
import express from 'express';
import process from 'process';
import container from './inversify.config';
import TYPES from './types';
import { DockerService, LoggerService } from './services';
import { WebhookRequest, WebhookRequestSchema } from './models/webhook-request.model';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file in the root directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT: number = Number(process.env.PORT) || 4000;
const dockerService = container.get<DockerService>(TYPES.DockerService);
const logger = container.get<LoggerService>(TYPES.LoggerService);

app.use(express.json());

const APIKey = process.env.APIKey;

const apiKeyAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const apiKey = req.headers['x-api-key'];

    if (apiKey && apiKey === APIKey) {
        next();
    } else {
        console.log(`Provided: ${apiKey}, Needed: ${APIKey}`);

        res.status(403).json({ message: "Forbidden: Invalid API Key" });
    }
};

app.use(apiKeyAuth);

app.get('/', (_req: express.Request, response: express.Response): void => {
    dockerService.getImages((error, images) => {
        if (error) {
            return;
        }

        response.json({ images: images });
    });
});

app.post('/webhook', (request: express.Request, response: express.Response): void => {
    logger.info('Webhook Posted:', request.body);

    const { error } = WebhookRequestSchema.validate(request.body);

    if (error) {
        logger.error(`Validation Error: ${error.message}`);
        
        response.status(400).json({ message: "Invalid Request Data", error: error.message });
        
        return;
    }

    const webhookRequest: WebhookRequest = request.body;

    dockerService.runDockerComposeUp(webhookRequest.data.imageTag, (error, stdout, stderr) => {
        if (error) {
            response.status(500).json({ message: "Error Executing Docker-Compose", error: error.message });
            
            return;
        }

        if (stderr) {
            logger.error(`Error: ${stderr}`);
        }

        response.json({ message: "Docker-Compose Executed Successfully", output: stdout });
    });
});

app.listen(PORT, () => {
    logger.info(`Webhook Listener Running on Port: ${PORT}`);
}).on("error", (err) => {
    logger.error('Failed to Start:', err);
});