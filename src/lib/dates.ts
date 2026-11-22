export function today(): string {
  return toISO(new Date());
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function daysBetween(fromISO: string, toISOStr: string): number {
  return Math.round((parseISO(toISOStr).getTime() - parseISO(fromISO).getTime()) / 86400000);
}

export function ageLabel(hatch?: string, ref: string = today()): string {
  if (!hatch) return 'Age unknown';
  const d = daysBetween(hatch, ref);
  if (d < 0) return 'Not hatched';
  if (d < 14) return `${d} day${d === 1 ? '' : 's'}`;
  if (d < 120) return `${Math.floor(d / 7)} wks`;
  const months = Math.floor(d / 30.44);
  if (months < 24) return `${months} mos`;
  return `${(d / 365.25).toFixed(1)} yrs`;
}

/** Short date without the year when it's the current year. */
export function fmtShort(iso?: string): string {
  if (!iso) return '—';
  const d = parseISO(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-PH', sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmt(iso?: string): string {
  if (!iso) return '—';
  return parseISO(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}
