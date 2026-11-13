import { z } from 'zod';

const TRUE_VALUES = ['1', 'true', 'yes', 'on'];

/** Booleans accept the legacy string forms ("1", "yes", "on"...); any other string is false. */
const flag = (fallback: boolean) =>
  z.preprocess(
    (value) => (typeof value === 'string' ? TRUE_VALUES.includes(value.trim().toLowerCase()) : value),
    z.boolean().default(fallback),
  );

/** Lists accept a JSON array or, from env vars, a comma-separated string. */
const list = (fallback: string[]) =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    if (value.trim().startsWith('[')) return JSON.parse(value);

    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }, z.array(z.string()).default(fallback));

const DISCORD_WEBHOOK = /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//;

/**
 * Watchdog configuration. Keys match app/config.json so existing config and override
 * files keep working; the auth keys are new and all empty, so auth is off by default.
 */
export const appConfigSchema = z.object({
  ProjectsDirectory: z.string().min(1).default('/projects'),
  CronFilePath: z.string().default('/etc/cron.d/watchdog'),
  CronSchedule: z.string().default('0 4 * * *'),
  /** Container name to the name of the container it depends on. */
  ContainerDependencies: z.preprocess(
    (value) => (typeof value === 'string' ? JSON.parse(value || '{}') : value),
    z.record(z.string(), z.string()).default({}),
  ),
  /** Anything that is not a Discord webhook URL is treated as unset, as before. */
  DiscordWebhookUrl: z.preprocess(
    (value) => (typeof value === 'string' && DISCORD_WEBHOOK.test(value.trim()) ? value.trim() : ''),
    z.string(),
  ),
  DockerComposeAdditionalArgs: list(['--always-recreate-deps', '--remove-orphans']),
  ExcludeProjects: list([]),
  IncludeProjects: list([]),
  LogFilePath: z.string().default('/tmp/watchdog.log'),
  LockFilePath: z.string().default('/tmp/watchdog.lock'),
  SendUpdaterNotifications: flag(true),
  SendMonitorNotifications: flag(true),
  SendAPINotifications: flag(true),
  UpdaterTest: flag(false),
  UpdaterCronJob: flag(true),
  UpdaterNotificationTitle: z.string().default('Containers Update'),
  TimeZone: z.string().default('UTC'),

  /** Accepted in the x-api-key header (and on the socket.io handshake). Empty turns it off. */
  ApiKey: z.string().default(''),
  /** The UI login; both must be set to turn it on. */
  AdminUser: z.string().default(''),
  AdminPassword: z.string().default(''),
  /** Signs login tokens. When empty a random secret is used, so logins end on restart. */
  JwtSecret: z.string().default(''),
  /** Login token lifetime, e.g. "12h" or "7d". */
  JwtExpiresIn: z
    .string()
    .regex(/^\d+(ms|s|m|h|d|w|y)?$/, 'Expected a duration such as "12h"')
    .default('12h'),
});

export type AppConfig = z.output<typeof appConfigSchema>;

export const CONFIG_KEYS = Object.keys(appConfigSchema.shape) as (keyof AppConfig)[];

/** Keys whose values never leave the process. */
export const SECRET_KEYS: ReadonlySet<keyof AppConfig> = new Set([
  'DiscordWebhookUrl',
  'ApiKey',
  'AdminPassword',
  'JwtSecret',
]);
