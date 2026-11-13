import type { RestartEvent, UpdateRun } from '@subzerodev/watchdog-shared';

export interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  /** ISO 8601, UTC. */
  timestamp: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
}

export const COLORS = { green: 0x00ff00, update: 5763719 } as const;

/** A container the monitor restarted (legacy Restart-Container). */
export function monitorRestartEmbed(event: RestartEvent, timeZone: string): DiscordEmbed {
  return {
    title: `✅ ${event.target} Restarted! ✅`,
    description: `Container '${event.target}' Was Unhealthy and Has Been Restarted.`,
    color: COLORS.green,
    timestamp: event.timestamp,
    fields: [
      { name: 'Service Name', value: event.target, inline: false },
      { name: 'Time', value: formatTime(new Date(event.timestamp), timeZone, true), inline: false },
    ],
    footer: { text: 'Auto Recovery' },
  };
}

/** A restart Uptime Kuma asked for (legacy Flask /restart). */
export function uptimeKumaRestartEmbed(event: RestartEvent, timeZone: string): DiscordEmbed {
  const name = event.monitor?.name ?? event.target;

  return {
    title: `✅ ${name} Restarted! ✅`,
    color: COLORS.green,
    timestamp: event.timestamp,
    fields: [
      { name: 'Name', value: name, inline: false },
      { name: 'URL', value: event.monitor?.url || 'N/A', inline: false },
      { name: 'Time', value: formatTime(new Date(event.timestamp), event.timeZone || timeZone), inline: false },
    ],
    footer: { text: 'Uptime Kuma Auto Recovery' },
  };
}

/** The updater's summary (legacy Start-Update). */
export function updateEmbed(run: UpdateRun, title: string): DiscordEmbed {
  return {
    title: run.dryRun ? `${title} (Dry Run)` : title,
    description: run.summary,
    color: COLORS.update,
    timestamp: run.finishedAt,
    footer: { text: 'Update Complete' },
  };
}

/** "2026-11-13 18:40:00", plus " +02:00" with the offset; UTC when the time zone is unknown. */
export function formatTime(date: Date, timeZone: string, withOffset = false): string {
  let parts: Intl.DateTimeFormatPart[];

  try {
    parts = formatter(timeZone).formatToParts(date);
  } catch {
    parts = formatter('UTC').formatToParts(date);
  }

  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  const time = `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}:${part('second')}`;

  if (!withOffset) return time;

  const offset = part('timeZoneName').replace(/^GMT/, '') || '+00:00';

  return `${time} ${offset}`;
}

function formatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'longOffset',
  });
}
