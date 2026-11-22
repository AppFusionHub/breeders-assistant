import type { HealthEvent, HealthKind, ProtocolItem } from '../db';
import { addDays } from './dates';

export const KINDS: { id: HealthKind; label: string; plural: string }[] = [
  { id: 'vaccine', label: 'Vaccine', plural: 'Vaccines' },
  { id: 'deworm', label: 'Deworming', plural: 'Deworming' },
  { id: 'vitamins', label: 'Vitamins', plural: 'Vitamins' },
  { id: 'treatment', label: 'Treatment', plural: 'Treatments' },
  { id: 'other', label: 'Other', plural: 'Other' },
];

export const kindLabel = (k: HealthKind) => KINDS.find((x) => x.id === k)?.label ?? k;

export interface BirdDue { protocolId: number; name: string; route?: string; due: string; dueEnd: string; overdue: boolean }

/** Vaccination schedule items this bird has not had yet (needs a hatch date). */
export function pendingForBird(hatch: string | undefined, protocol: ProtocolItem[], events: HealthEvent[], today: string): BirdDue[] {
  if (!hatch) return [];
  const done = new Set(events.filter((e) => e.protocolId != null).map((e) => e.protocolId));
  return protocol
    .filter((p) => !done.has(p.id))
    .map((p) => {
      const due = addDays(hatch, p.dayFrom), dueEnd = addDays(hatch, p.dayTo);
      return { protocolId: p.id, name: p.name, route: p.route, due, dueEnd, overdue: dueEnd < today };
    })
    .sort((a, b) => a.due.localeCompare(b.due));
}

/** Records to create when a reminder with logAs is ticked done. */
export function recordsFromReminder(r: { id: number; title: string; notes?: string; logAs?: HealthKind; birdIds: number[] }, occDate: string) {
  if (!r.logAs || !r.birdIds.length) return [];
  return r.birdIds.map((birdId) => ({ birdId, date: occDate, kind: r.logAs!, product: r.title, reminderId: r.id, occDate, notes: 'Recorded from reminder' }));
}
