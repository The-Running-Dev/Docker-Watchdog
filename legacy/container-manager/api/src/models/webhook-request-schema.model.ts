// src/models/webhook-request-schema.model.ts

import Joi from 'joi';

export const WebhookRequestSchema = Joi.object({
    event: Joi.string().required(),
    data: Joi.object({
        projectOrContainerId: Joi.string().required(),
        hardReset: Joi.boolean(),
        isTest: Joi.boolean().required()
    }).required(),
}).required();