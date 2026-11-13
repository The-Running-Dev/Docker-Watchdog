import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { RestartEvent, UpdateRun } from '@subzerodev/watchdog-shared';
import { ConfigService } from '../config/config.service.js';
import { WatchdogEvents } from '../events.js';
import { LogService } from '../logging/log.service.js';
import { monitorRestartEmbed, updateEmbed, uptimeKumaRestartEmbed, type DiscordEmbed } from './discord-embeds.js';

const SEND_TIMEOUT_MS = 10_000;

/**
 * Sends Discord messages for monitor restarts (SendMonitorNotifications), Uptime Kuma restarts
 * (SendAPINotifications) and updater runs (SendUpdaterNotifications). Only successful restarts
 * are announced; other restart sources are shown in the UI only.
 */
@Injectable()
export class DiscordService {
  constructor(
    private readonly config: ConfigService,
    private readonly log: LogService,
  ) {}

  @OnEvent(WatchdogEvents.Restart, { async: true, promisify: true })
  async onRestart(event: RestartEvent): Promise<void> {
    if (!event.success || event.dryRun) return;

    const { SendMonitorNotifications, SendAPINotifications, TimeZone } = this.config.values;

    if (event.source === 'monitor' && SendMonitorNotifications) {
      await this.send(monitorRestartEmbed(event, TimeZone));
    } else if (event.source === 'uptime-kuma' && SendAPINotifications) {
      await this.send(uptimeKumaRestartEmbed(event, TimeZone));
    }
  }

  @OnEvent(WatchdogEvents.UpdateFinished, { async: true, promisify: true })
  async onUpdate(run: UpdateRun): Promise<void> {
    const { SendUpdaterNotifications, UpdaterNotificationTitle } = this.config.values;

    if (run.summary && SendUpdaterNotifications) await this.send(updateEmbed(run, UpdaterNotificationTitle));
  }

  /** Never throws: a failed notification is logged and dropped. */
  async send(embed: DiscordEmbed): Promise<boolean> {
    const url = this.config.values.DiscordWebhookUrl;

    if (!url) {
      this.log.debug(`Discord is not configured; not sending '${embed.title}'`);

      return false;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });

      if (!response.ok) {
        this.log.warn(`Discord notification failed: ${response.status} ${await response.text()}`);

        return false;
      }

      return true;
    } catch (error) {
      this.log.warn(`Discord notification failed: ${(error as Error).message}`);

      return false;
    }
  }
}
