// src/models/webhook-schema.model.ts

import { z } from 'zod';

export const WebhookSchema = z.object({
    event: z.string().min(1, 'Event is Required'),
    data: z.object({
        projectOrContainerId: z.string().min(1, 'Project or Container ID is Required'),
        hardReset: z.boolean(),
        isTest: z.boolean()
    })
});

export type WebhookFormData = z.infer<typeof WebhookSchema>;