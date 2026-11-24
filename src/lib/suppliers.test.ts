import { describe, expect, it } from 'vitest';
import { supplierStats, telLink } from './suppliers';
import type { Transaction } from '../db';

let id = 1;
const tx = (p: Partial<Transaction>): Transaction => ({ id: id++, type: 'expense', date: '2026-11-01', category: 'Feed', amount: 0, createdAt: id, ...p });

describe('supplierStats', () => {
  const txs = [
    tx({ date: '2026-10-01', amount: 1600, qty: 50, unit: 'kg', description: 'Grower pellets' }),
    tx({ date: '2026-11-01', amount: 1700, qty: 50, unit: 'kg', description: 'grower pellets' }),
    tx({ date: '2026-11-05', category: 'Vitamins & supplements', amount: 450, description: 'B-complex' }),
    tx({ date: '2026-11-06', type: 'income', category: 'Bird sale', amount: 5000 }),
  ];
  const s = supplierStats(txs);
  it('totals expenses only', () => {
    expect(s.total).toBe(3750);
    expect(s.count).toBe(3);
    expect(s.lastDate).toBe('2026-11-05');
  });
  it('averages feed price per kg', () => {
    expect(s.feedPerKg).toBeCloseTo(33);
  });
  it('groups items (case-insensitive) with unit price trend', () => {
    const feed = s.items.find((i) => i.category === 'Feed')!;
    expect(feed.count).toBe(2);
    expect(feed.last.unitPrice).toBeCloseTo(34);
    expect(feed.prev!.unitPrice).toBeCloseTo(32);
    expect(feed.trend).toBe('up');
    expect(s.items[0].label).toBe('B-complex'); // most recent first
    expect(s.items[0].trend).toBeNull();
  });
  it('makes dialable links', () => {
    expect(telLink('0917 123 4567')).toBe('tel:09171234567');
  });
});
