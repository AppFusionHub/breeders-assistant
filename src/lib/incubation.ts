import { addDays, daysBetween } from './dates';

export interface Milestone {
  day: number;
  title: string;
  detail: string;
}

// Chicken eggs hatch in about 21 days. Candling and lockdown days follow common extension guidance.
export const MILESTONES: Milestone[] = [
  { day: 0, title: 'Set eggs', detail: 'Incubator ~37.5 °C (99.5 °F), humidity ~50–55%. Turn eggs at least 3×/day (odd number).' },
  { day: 7, title: 'First candling', detail: 'Look for veins and a dark embryo spot. Remove clears (infertile) and blood rings.' },
  { day: 14, title: 'Second candling', detail: 'Developing eggs look mostly dark with a clear air cell. Remove ones that stopped developing.' },
  { day: 18, title: 'Lockdown', detail: 'Stop turning. Raise humidity to ~65–70%. Keep the incubator closed.' },
  { day: 21, title: 'Hatch day', detail: 'Expect pips and hatching around day 20–22. Leave chicks in until dry and fluffy.' },
];

export function milestoneDates(setDate: string) {
  return MILESTONES.map((m) => ({ ...m, date: addDays(setDate, m.day) }));
}

export function incubationDay(setDate: string, ref: string): number {
  return daysBetween(setDate, ref);
}

export function nextMilestone(setDate: string, ref: string) {
  const day = incubationDay(setDate, ref);
  return milestoneDates(setDate).find((m) => m.day >= day) ?? null;
}

export function rate(n?: number, d?: number): string {
  if (n == null || !d) return '—';
  return `${Math.round((n / d) * 100)}%`;
}
