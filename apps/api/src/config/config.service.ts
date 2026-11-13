import { SECRET_KEYS, type AppConfig } from './app-config.schema.js';

export const MASK = '********';

/** The loaded configuration. Provided with a factory, so it carries no DI metadata. */
export class ConfigService {
  constructor(readonly values: AppConfig) {}

  get loginEnabled(): boolean {
    return Boolean(this.values.AdminUser && this.values.AdminPassword);
  }

  get authEnabled(): boolean {
    return Boolean(this.values.ApiKey) || this.loginEnabled;
  }

  /** The config with every secret replaced by a mask (or left empty when unset). */
  masked(): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(this.values).map(([key, value]) => [
        key,
        SECRET_KEYS.has(key as keyof AppConfig) ? (value ? MASK : '') : value,
      ]),
    );
  }
}
