import { describe, expect, it } from 'vitest';
import { lineNicks, pairNicks, verdict, verdictLabel, type RatedBird } from './nick';

// Sires 1,2 ; dams 3,4. Pair 1×3 produces 5s; 1 with 4 and 2 with 3 produce 3s.
const base: RatedBird[] = [
  { id: 1, bloodline: 'Kelso' }, { id: 2, bloodline: 'Hatch' },
  { id: 3, bloodline: 'Sweater' }, { id: 4, bloodline: 'Roundhead' },
];
let next = 100;
const kids = (sire: number, dam: number, ratings: number[]) => ratings.map((r) => ({ id: next++, sireId: sire, damId: dam, rating: r }));
const birds: RatedBird[] = [
  ...base,
  ...kids(1, 3, [5, 5, 4, 5]),
  ...kids(1, 4, [3, 3, 3]),
  ...kids(2, 3, [3, 2, 3]),
  ...kids(2, 4, [3]), // below min, ignored as a pair but still counts as "other mates"
  { id: 999, sireId: 1, damId: 3 }, // unrated: ignored
];

describe('pair nicks', () => {
  const r = pairNicks(birds);
  it('ranks the nicking pair first and compares against other mates', () => {
    expect(r[0].key).toBe('1|3');
    expect(r[0].n).toBe(4);
    expect(r[0].mean).toBeCloseTo(4.75);
    // sire 1 with others: 3 ; dam 3 with others: 8/3 → expected ≈ 2.833
    expect(r[0].expected).toBeCloseTo((3 + 8 / 3) / 2);
    expect(r[0].basis).toBe('other-mates');
    expect(verdict(r[0])).toBe('strong');
    expect(verdictLabel(r[0])).toBe('Strong nick');
  });
  it('softens labels for early data', () => {
    const early = r.find((x) => x.key === '2|3')!; // 3 offspring
    expect(verdictLabel(early)).toBe('Below expected');
  });
  it('skips pairs below the minimum and unrated birds', () => {
    expect(r.find((x) => x.key === '2|4')).toBeUndefined();
  });
  it('falls back to flock average when parents have no other mates', () => {
    const solo = pairNicks([...base, ...kids(2, 4, [4, 4])]);
    expect(solo[0].basis).toBe('flock-average');
  });
});

describe('line nicks', () => {
  it('groups by sire bloodline × dam bloodline', () => {
    const r = lineNicks(birds);
    expect(r[0].sire).toBe('Kelso');
    expect(r[0].dam).toBe('Sweater');
    expect(verdict(r[0])).toBe('strong');
  });
});
