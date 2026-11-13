import type { RestartEvent, UpdateRun } from '@subzerodev/watchdog-shared';
import { describe, expect, it } from 'vitest';
import { COLORS, formatTime, monitorRestartEmbed, updateEmbed, uptimeKumaRestartEmbed } from './discord-embeds.js';

const at = '2026-07-01T12:34:56.000Z';

const restart = (event: Partial<RestartEvent>): RestartEvent => ({
  kind: 'container',
  target: 'plex',
  source: 'monitor',
  dryRun: false,
  success: true,
  message: 'plex Restarted',
  commands: ['docker restart plex'],
  timestamp: at,
  ...event,
});

describe('formatTime', () => {
  it('formats in the time zone, with the offset when asked', () => {
    expect(formatTime(new Date(at), 'Europe/Sofia')).toBe('2026-07-01 15:34:56');
    expect(formatTime(new Date(at), 'Europe/Sofia', true)).toBe('2026-07-01 15:34:56 +03:00');
    expect(formatTime(new Date(at), 'America/Denver', true)).toBe('2026-07-01 06:34:56 -06:00');
  });

  it('uses UTC for unknown time zones', () => {
    expect(formatTime(new Date(at), 'UTC', true)).toBe('2026-07-01 12:34:56 +00:00');
    expect(formatTime(new Date(at), 'Not/AZone', true)).toBe('2026-07-01 12:34:56 +00:00');
  });

  it('uses 00 for midnight, not 24', () => {
    expect(formatTime(new Date('2026-07-01T00:05:00Z'), 'UTC')).toBe('2026-07-01 00:05:00');
  });
});

describe('embeds', () => {
  it('monitor restart', () => {
    expect(monitorRestartEmbed(restart({}), 'UTC')).toEqual({
      title: '✅ plex Restarted! ✅',
      description: "Container 'plex' Was Unhealthy and Has Been Restarted.",
      color: COLORS.green,
      timestamp: at,
      fields: [
        { name: 'Service Name', value: 'plex', inline: false },
        { name: 'Time', value: '2026-07-01 12:34:56 +00:00', inline: false },
      ],
      footer: { text: 'Auto Recovery' },
    });
  });

  it("Uptime Kuma restart, in the heartbeat's time zone", () => {
    const embed = uptimeKumaRestartEmbed(
      restart({ source: 'uptime-kuma', monitor: { name: 'Plex', url: 'http://plex' }, timeZone: 'Europe/Sofia' }),
      'UTC',
    );

    expect(embed).toEqual({
      title: '✅ Plex Restarted! ✅',
      color: COLORS.green,
      timestamp: at,
      fields: [
        { name: 'Name', value: 'Plex', inline: false },
        { name: 'URL', value: 'http://plex', inline: false },
        { name: 'Time', value: '2026-07-01 15:34:56', inline: false },
      ],
      footer: { text: 'Uptime Kuma Auto Recovery' },
    });
    expect(uptimeKumaRestartEmbed(restart({ source: 'uptime-kuma' }), 'UTC').fields).toEqual([
      { name: 'Name', value: 'plex', inline: false },
      { name: 'URL', value: 'N/A', inline: false },
      { name: 'Time', value: '2026-07-01 12:34:56', inline: false },
    ]);
  });

  it('update summary', () => {
    const run = { dryRun: false, summary: ' - web: ✅ All Services Healthy.', finishedAt: at } as UpdateRun;

    expect(updateEmbed(run, 'Updates')).toEqual({
      title: 'Updates',
      description: ' - web: ✅ All Services Healthy.',
      color: COLORS.update,
      timestamp: at,
      footer: { text: 'Update Complete' },
    });
    expect(updateEmbed({ ...run, dryRun: true }, 'Updates').title).toBe('Updates (Dry Run)');
  });
});
