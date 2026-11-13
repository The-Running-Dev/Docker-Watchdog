import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { type DynamicModule, Logger, Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { LEGACY_ROUTES } from '../app.setup.js';

/** Requests the UI never answers: the API, the socket and the legacy root routes fall through to Nest. */
export const UI_EXCLUDE = new RegExp(`^/(${['api', 'socket\\.io', ...LEGACY_ROUTES].join('|')})(/|$)`);

/**
 * Where the built UI is: WATCHDOG_UI_PATH, else apps/ui/dist next to this package
 * (from apps/api/dist or apps/api/src). An empty WATCHDOG_UI_PATH turns the UI off.
 */
export function resolveUiPath(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const configured = env.WATCHDOG_UI_PATH;

  if (configured !== undefined) return configured.trim() ? resolve(configured) : undefined;

  return join(import.meta.dirname, '..', '..', '..', 'ui', 'dist');
}

@Module({})
export class UiModule {
  /** Serves the UI at / when it has been built; the API runs on its own otherwise. */
  static register(uiPath: string | undefined = resolveUiPath()): DynamicModule {
    const logger = new Logger(UiModule.name);

    if (!uiPath || !existsSync(join(uiPath, 'index.html'))) {
      if (uiPath) logger.warn(`No UI at ${uiPath}; serving the API only.`);

      return { module: UiModule };
    }

    return {
      module: UiModule,
      imports: [ServeStaticModule.forRoot({ rootPath: uiPath, exclude: UI_EXCLUDE })],
    };
  }
}
