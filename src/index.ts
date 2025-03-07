// src/index.ts

import 'reflect-metadata';
import express from 'express';
import container from './inversify.config';
import TYPES from './types';
import { DockerService, LoggerService, LoggerStreamService } from './services';
import { WebhookRequest, WebhookRequestSchema } from './models/webhook-request.model';
import { apiKeyAuth, PromptUtils } from './utils';
import { environment } from './environments/environment';

const app = express();
const dockerService = container.get<DockerService>(TYPES.DockerService);
const logger = container.get<LoggerService>(TYPES.LoggerService);
const loggerStream = container.get<LoggerStreamService>(TYPES.LoggerStreamService);

app.use(express.json());
app.use(apiKeyAuth(environment.apiKey));

app.get('/', async (_req: express.Request, response: express.Response): Promise<void> => {
    try {
        const images = await dockerService.getImages();

        response.json({ images: images });
    } catch (error: any) {
        response.status(500).json({ message: "Error Fetching Images", error: error.message });
    }
});

app.get('/logs', async (_req: express.Request, response: express.Response): Promise<void> => {
    try {
        const logs = loggerStream.getStream();

        response.json(logs);
    } catch (error: any) {
        response.status(500).json({ message: "Error Fetching Logs", error: error.message });
    }
});

app.post('/webhook', async (request: express.Request, response: express.Response): Promise<void> => {
    logger.info('Webhook Posted:', request.body);

    const { error } = WebhookRequestSchema.validate(request.body);

    if (error) {
        logger.error(`Validation Error: ${error.message}`);
        
        response.status(400).json({ message: "Invalid Request Data", error: error.message });
        
        return;
    }

    const webhookRequest: WebhookRequest = request.body;

    try {
        if (webhookRequest.isTest) {
            response.json({
                request: webhookRequest,
                response: {
                    success: false,
                    message: `isTest: ${webhookRequest.isTest}`,
                    image: webhookRequest.data.tag
                }
            });
        } else {
            const { success, message, image, config } = await dockerService.restartComposeImage(webhookRequest);

            response.json({
                request: webhookRequest,
                response: {
                    success: success,
                    message: message,
                    image: image,
                    config: config
                }
            });
        }
    } catch (error: any) {
        response.status(500).json({ message: "Error Executing Docker-Compose", error: error.message });
    }
});

app.listen(environment.port, async () => {
    logger.info(`Docker-Webhooks, v${environment.version} (${environment.buildDate}), Running on Port: ${environment.port}`);

    await dockerService.initialize();

    if (environment.runInteractive) {
        await PromptUtils.promptUserForMethod(dockerService);
    }
}).on("error", (err) => {
    logger.error('Failed to Start:', err);
});