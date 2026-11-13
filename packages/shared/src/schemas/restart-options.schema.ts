import { z } from 'zod';

const composeOption = z.string().startsWith('-', { message: "Expected an option for 'docker compose up'" });

/** Body of POST /api/projects/:name/restart. Every field is optional. */
export const projectRestartOptionsSchema = z
  .object({
    /** Pull the project's images before starting it. */
    pull: z.boolean().default(true),
    /** Take the project down, then recreate every container. */
    hardReset: z.boolean().default(false),
    /** Also remove the project's volumes. Needs hardReset, and is never on by default. */
    deleteVolumes: z.boolean().default(false),
    /** List the commands without running them. */
    dryRun: z.boolean().default(false),
    /** Options for `docker compose up`; the configured DockerComposeAdditionalArgs when absent. */
    additionalArgs: z.array(composeOption).optional(),
  })
  .refine((options) => !options.deleteVolumes || options.hardReset, {
    message: 'deleteVolumes needs hardReset',
    path: ['deleteVolumes'],
  });

export type ProjectRestartOptions = z.infer<typeof projectRestartOptionsSchema>;

/** Body of POST /api/containers/:name/restart. Every field is optional. */
export const containerRestartOptionsSchema = z.object({
  /**
   * recreate: `docker compose up -d --no-deps --force-recreate <service>` for a compose container,
   * falling back to `docker restart` for a standalone one. restart: always `docker restart`.
   */
  mode: z.enum(['recreate', 'restart']).default('recreate'),
  /** Pull the service's image first (compose containers only). */
  pull: z.boolean().default(false),
  dryRun: z.boolean().default(false),
});

export type ContainerRestartOptions = z.infer<typeof containerRestartOptionsSchema>;

/** Body of POST /api/auth/login. */
export const loginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export interface LoginResponse {
  username: string;
  token: string;
  expiresIn: string;
}
