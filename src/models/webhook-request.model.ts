// src/models/webhook-request.model.ts

import Joi from 'joi';

export interface WebhookRequest {
    event: string;
    data: {
        imageTag: string;
    };
}

export const WebhookRequestSchema = Joi.object({
    event: Joi.string().required(),
    data: Joi.object({
        imageTag: Joi.string().required()
    }).required()
});