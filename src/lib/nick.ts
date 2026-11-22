export interface RatedBird {
  id: number;
  sireId?: number;
  damId?: number;
  rating?: number;
  bloodline?: string;
}

export interface NickResult {
  key: string;
  sire: string | number;
  dam: string | number;
  n: number; // rated offspring
  mean: number;
  min: number;
  max: number;
  expected: number; // what we'd predict from each side's results with other mates
  basis: 'other-mates' | 'flock-average';
  diff: number; // mean - expected
}

export type NickVerdict = 'strong' | 'possible' | 'neutral' | 'poor';

export const MIN_PAIR = 2;
export const MIN_LINE = 3;

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Generic nick finder. `sideA`/`sideB` pick the sire-side and dam-side group of each offspring
 * (individual birds for pair nicks, bloodlines for line crosses).
 * Expected = mean of (sire-side's offspring with OTHER dam-sides, dam-side's offspring with OTHER sire-sides).
 */
function findNicks(
  offspring: { a: string | number; b: string | number; r: number }[],
  minN: number,
): NickResult[] {
  if (!offspring.length) return [];
  const flock = avg(offspring.map((o) => o.r));
  const groups = new Map<string, typeof offspring>();
  for (const o of offspring) {
    const k = `${o.a}|${o.b}`;
    groups.set(k, [...(groups.get(k) ?? []), o]);
  }
  const out: NickResult[] = [];
  for (const [key, g] of groups) {
    if (g.length < minN) continue;
    const { a, b } = g[0];
    const rs = g.map((o) => o.r);
    const mean = avg(rs);
    const aOther = offspring.filter((o) => o.a === a && o.b !== b).map((o) => o.r);
    const bOther = offspring.filter((o) => o.b === b && o.a !== a).map((o) => o.r);
    const parts = [aOther, bOther].filter((x) => x.length).map(avg);
    const expected = parts.length ? avg(parts) : flock;
    out.push({
      key, sire: a, dam: b, n: g.length, mean, min: Math.min(...rs), max: Math.max(...rs),
      expected, basis: parts.length ? 'other-mates' : 'flock-average', diff: mean - expected,
    });
  }
  return out.sort((x, y) => y.diff - x.diff || y.n - x.n);
}

function rated(birds: RatedBird[]) {
  return birds.filter((b) => b.rating != null && b.rating > 0);
}

export function pairNicks(birds: RatedBird[], minN = MIN_PAIR): NickResult[] {
  const off = rated(birds)
    .filter((b) => b.sireId != null && b.damId != null)
    .map((b) => ({ a: b.sireId!, b: b.damId!, r: b.rating! }));
  return findNicks(off, minN);
}

export function lineNicks(birds: RatedBird[], minN = MIN_LINE): NickResult[] {
  const byId = new Map(birds.map((b) => [b.id, b]));
  const off = rated(birds).flatMap((b) => {
    const s = byId.get(b.sireId ?? -1)?.bloodline?.trim();
    const d = byId.get(b.damId ?? -1)?.bloodline?.trim();
    return s && d ? [{ a: s, b: d, r: b.rating! }] : [];
  });
  return findNicks(off, minN);
}

export function verdict(r: NickResult): NickVerdict {
  if (r.diff >= 0.5) return 'strong';
  if (r.diff >= 0.2) return 'possible';
  if (r.diff <= -0.5) return 'poor';
  return 'neutral';
}

export function confidence(r: NickResult): 'early' | 'fair' | 'good' {
  if (r.basis === 'flock-average' || r.n < 4) return 'early';
  if (r.n < 8) return 'fair';
  return 'good';
}

export const VERDICT_TEXT: Record<NickVerdict, string> = {
  strong: 'Strong nick',
  possible: 'Possible nick',
  neutral: 'As expected',
  poor: 'Poor cross',
};

/** Label that doesn't overclaim on thin data. */
export function verdictLabel(r: NickResult): string {
  const v = verdict(r);
  if (confidence(r) !== 'early') return VERDICT_TEXT[v];
  if (v === 'strong' || v === 'possible') return 'Promising';
  if (v === 'poor') return 'Below expected';
  return VERDICT_TEXT.neutral;
}
