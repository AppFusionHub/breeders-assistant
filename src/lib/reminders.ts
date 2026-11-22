import { addDays, daysBetween } from './dates';

export type Repeat =
  | { kind: 'once' }
  | { kind: 'every'; days: number }; // days=1 daily, 7 weekly

export interface ReminderLike {
  title: string;
  notes?: string;
  date: string; // first occurrence YYYY-MM-DD
  time: string; // HH:MM
  repeat: Repeat;
  endDate?: string;
}

export function occursOn(r: ReminderLike, iso: string): boolean {
  if (iso < r.date) return false;
  if (r.endDate && iso > r.endDate) return false;
  if (r.repeat.kind === 'once') return iso === r.date;
  return daysBetween(r.date, iso) % Math.max(1, r.repeat.days) === 0;
}

export function repeatLabel(r: ReminderLike): string {
  if (r.repeat.kind === 'once') return 'Once';
  const d = r.repeat.days;
  const base = d === 1 ? 'Daily' : d === 7 ? 'Weekly' : `Every ${d} days`;
  return r.endDate ? `${base} until ${r.endDate}` : base;
}

/** Number of occurrences (Infinity if open-ended repeat). */
export function occurrenceCount(r: ReminderLike): number {
  if (r.repeat.kind === 'once') return 1;
  if (!r.endDate) return Infinity;
  return Math.floor(daysBetween(r.date, r.endDate) / r.repeat.days) + 1;
}

export function lastOccurrence(r: ReminderLike): string | null {
  if (r.repeat.kind === 'once') return r.date;
  if (!r.endDate) return null;
  return addDays(r.date, (occurrenceCount(r) - 1) * r.repeat.days);
}

// ---- Calendar export (gives real phone alarms, works offline) ----

const compact = (iso: string, time: string) => `${iso.replace(/-/g, '')}T${time.replace(':', '')}00`;

function rrule(r: ReminderLike): string | null {
  if (r.repeat.kind === 'once') return null;
  const parts = [`FREQ=DAILY`, `INTERVAL=${r.repeat.days}`];
  if (r.endDate) parts.push(`UNTIL=${compact(r.endDate, '23:59')}`);
  return `RRULE:${parts.join(';')}`;
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function fold(line: string): string {
  // RFC 5545: lines longer than 75 octets are folded.
  const out: string[] = [];
  let s = line;
  while (s.length > 74) { out.push(s.slice(0, 74)); s = ' ' + s.slice(74); }
  out.push(s);
  return out.join('\r\n');
}

/** Event end = start + 15 min, capped at 23:59 so it never wraps to before the start. */
function plus15(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const t = Math.min(23 * 60 + 59, h * 60 + m + 15);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

export function toICS(items: (ReminderLike & { uid: string })[], tz = 'Asia/Manila'): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', "PRODID:-//Breeder's Assistant//EN", 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const r of items) {
    const endTime = plus15(r.time);
    lines.push('BEGIN:VEVENT', `UID:${r.uid}@breeders-assistant`, `DTSTAMP:${now}Z`,
      `DTSTART;TZID=${tz}:${compact(r.date, r.time)}`, `DTEND;TZID=${tz}:${compact(r.date, endTime)}`,
      fold(`SUMMARY:${escapeText(r.title)}`));
    if (r.notes) lines.push(fold(`DESCRIPTION:${escapeText(r.notes)}`));
    const rr = rrule(r);
    if (rr) lines.push(rr);
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', fold(`DESCRIPTION:${escapeText(r.title)}`), 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

export function googleCalendarUrl(r: ReminderLike, tz = 'Asia/Manila'): string {
  const endTime = plus15(r.time);
  const p = new URLSearchParams({
    action: 'TEMPLATE', text: r.title, details: r.notes ?? '',
    dates: `${compact(r.date, r.time)}/${compact(r.date, endTime)}`, ctz: tz,
  });
  const rr = rrule(r);
  if (rr) p.set('recur', rr);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
