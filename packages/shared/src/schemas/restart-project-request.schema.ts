import { z } from 'zod';

/**
 * Body of the legacy POST /restart-project route. The contract is kept as is:
 * additionalArgs are options for `docker compose up`, so each must start with "-".
 */
export const restartProjectRequestSchema = z.object({
  event: z.literal('update-project'),
  data: z.object({
    projectId: z.string().trim().min(1),
    additionalArgs: z
      .union([z.string(), z.array(z.string())])
      .nullish()
      .transform((args) => (args == null ? [] : Array.isArray(args) ? args : [args]))
      .refine((args) => args.every((a) => a.startsWith('-')), {
        message: "Expected a list of options for 'docker compose up'",
      }),
    isTest: z.boolean().default(false),
  }),
});

export type RestartProjectRequest = z.infer<typeof restartProjectRequestSchema>;
