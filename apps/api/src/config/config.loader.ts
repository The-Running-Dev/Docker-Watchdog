import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { appConfigSchema, CONFIG_KEYS, type AppConfig } from './app-config.schema.js';

export interface ConfigSources {
  /** Base config file; missing is fine. Default: $CONFIG_FILE, else /app/config.json. */
  configFile?: string;
  /** Overrides file; missing is fine. Default: $CONFIG_OVERRIDES_FILE, else config.overrides.json beside the config file. */
  overridesFile?: string;
  env?: NodeJS.ProcessEnv;
}

/**
 * Builds the config the way watchdog.psm1 did: defaults, then config.json, then
 * config.overrides.json. Environment variables named after a key win over both.
 */
export function loadConfig(sources: ConfigSources = {}): AppConfig {
  const env = sources.env ?? process.env;
  const configFile = sources.configFile ?? env.CONFIG_FILE ?? '/app/config.json';
  const overridesFile =
    sources.overridesFile ?? env.CONFIG_OVERRIDES_FILE ?? join(dirname(configFile), 'config.overrides.json');

  const merged: Record<string, unknown> = {
    ...(env.TZ ? { TimeZone: env.TZ } : {}),
    ...readJson(configFile),
    ...readJson(overridesFile),
  };

  for (const key of CONFIG_KEYS) {
    const value = env[key];

    if (value !== undefined) merged[key] = value;
  }

  let result: ReturnType<typeof appConfigSchema.safeParse>;

  try {
    result = appConfigSchema.safeParse(merged);
  } catch (error) {
    // JSON in an env var (lists, ContainerDependencies) that does not parse.
    throw new Error(`Invalid configuration: ${(error as Error).message}`, { cause: error });
  }

  if (!result.success) {
    const problems = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');

    throw new Error(`Invalid configuration: ${problems}`);
  }

  return result.data;
}

function readJson(file: string): Record<string, unknown> {
  if (!existsSync(file)) return {};

  try {
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('expected a JSON object');
    }

    return parsed as Record<string, unknown>;
  } catch (error) {
    throw new Error(`Cannot read config file ${file}: ${(error as Error).message}`, { cause: error });
  }
}
