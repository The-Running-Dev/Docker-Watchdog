import { INestApplication } from '@nestjs/common';

/**
 * Routes kept at the root for existing callers (Uptime Kuma, CI webhooks).
 * Everything else lives under /api.
 */
export const LEGACY_ROUTES = ['health', 'restart', 'restart-project'];

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api', { exclude: LEGACY_ROUTES });
  app.enableShutdownHooks();
}
