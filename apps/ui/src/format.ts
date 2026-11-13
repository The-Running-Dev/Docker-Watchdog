import { format } from 'date-fns';

/** The Container-Manager timestamp format: 2026.11.13 @ 18.42.07 */
export function formatTime(iso: string): string {
  const date = new Date(iso);

  return Number.isNaN(date.getTime()) ? iso : format(date, 'yyyy.MM.dd @ HH.mm.ss');
}
