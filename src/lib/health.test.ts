import { describe, expect, it } from 'vitest';
import { pendingForBird, recordsFromReminder } from './health';
import type { HealthEvent, ProtocolItem } from '../db';

const protocol: ProtocolItem[] = [
  { id: 1, name: 'ND B1', dayFrom: 3, dayTo: 7 },
  { id: 2, name: 'ND La Sota', dayFrom: 14, dayTo: 17 },
  { id: 3, name: 'ND killed', dayFrom: 28, dayTo: 28 },
];

describe('pendingForBird', () => {
  it('lists unfinished schedule items with due dates and overdue flag', () => {
    const events = [{ id: 1, birdId: 5, date: '2026-11-05', kind: 'vaccine', product: 'ND B1', protocolId: 1 }] as HealthEvent[];
    const r = pendingForBird('2026-11-01', protocol, events, '2026-11-20');
    expect(r.map((x) => x.protocolId)).toEqual([2, 3]);
    expect(r[0]).toMatchObject({ due: '2026-11-15', dueEnd: '2026-11-18', overdue: true });
    expect(r[1].overdue).toBe(false);
  });
  it('needs a hatch date', () => {
    expect(pendingForBird(undefined, protocol, [], '2026-11-20')).toEqual([]);
  });
});

describe('recordsFromReminder', () => {
  it('creates one record per bird when logAs is set', () => {
    const recs = recordsFromReminder({ id: 9, title: 'Vitamins in water', logAs: 'vitamins', birdIds: [1, 2, 3] }, '2026-11-22');
    expect(recs).toHaveLength(3);
    expect(recs[0]).toMatchObject({ birdId: 1, kind: 'vitamins', product: 'Vitamins in water', reminderId: 9, occDate: '2026-11-22' });
  });
  it('creates nothing without logAs or birds', () => {
    expect(recordsFromReminder({ id: 9, title: 'x', birdIds: [1] }, '2026-11-22')).toEqual([]);
    expect(recordsFromReminder({ id: 9, title: 'x', logAs: 'deworm', birdIds: [] }, '2026-11-22')).toEqual([]);
  });
});
