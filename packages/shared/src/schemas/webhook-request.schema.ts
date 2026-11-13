import { z } from 'zod';
import { WebhookEvent } from '../models/webhook-event.enum.js';

/** Body of POST /api/webhook. */
export const webhookRequestSchema = z.object({
  event: z.enum(WebhookEvent),
  data: z
    .object({
      projectOrContainerId: z.string().trim().min(1),
      hardReset: z.boolean().default(false),
      /** Also remove the project's volumes on a hard reset. Opt-in only. */
      deleteVolumes: z.boolean().default(false),
      isTest: z.boolean().default(false),
    })
    .refine((data) => !data.deleteVolumes || data.hardReset, {
      message: 'deleteVolumes needs hardReset',
      path: ['deleteVolumes'],
    }),
});

export type WebhookRequest = z.infer<typeof webhookRequestSchema>;
