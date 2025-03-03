// src/models/webhook-request.model.ts

import Joi from 'joi';

export interface WebhookRequest {
    event: string;
    data: {
        tag: string;
    };
    parameters: {
        hardReset: boolean;
    }
    isTest: boolean;
}

export const WebhookRequestSchema = Joi.object({
    event: Joi.string().required(),
    data: Joi.object({
        tag: Joi.string().required()
    }).required(),
    parameters: Joi.object({
        hardReset: Joi.boolean()
    }),
    isTest: Joi.boolean().required()
}).required();