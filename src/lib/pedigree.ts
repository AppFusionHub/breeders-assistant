export interface PedigreeNode {
  id: number;
  sireId?: number;
  damId?: number;
}

export type Lookup = (id: number) => PedigreeNode | undefined;

/**
 * Wright's coefficient of relationship via the recursive kinship method.
 * kinship(a, b) = probability that a random allele from a and one from b are identical by descent.
 * Offspring inbreeding (COI) = kinship(sire, dam).
 */
export function makeKinship(lookup: Lookup, maxDepth = 12) {
  const ancestorCache = new Map<number, Set<number>>();
  const kinCache = new Map<string, number>();

  function ancestors(id: number): Set<number> {
    const cached = ancestorCache.get(id);
    if (cached) return cached;
    const out = new Set<number>();
    const stack: [number, number][] = [[id, 0]];
    while (stack.length) {
      const [cur, depth] = stack.pop()!;
      if (depth >= maxDepth) continue;
      const n = lookup(cur);
      for (const p of [n?.sireId, n?.damId]) {
        if (p != null && !out.has(p) && p !== id) {
          out.add(p);
          stack.push([p, depth + 1]);
        }
      }
    }
    ancestorCache.set(id, out);
    return out;
  }

  function inbreeding(id: number, depth: number): number {
    const n = lookup(id);
    if (!n || n.sireId == null || n.damId == null) return 0;
    return kinship(n.sireId, n.damId, depth + 1);
  }

  function kinship(a: number | undefined, b: number | undefined, depth = 0): number {
    if (a == null || b == null || depth > maxDepth * 2) return 0;
    if (a === b) return 0.5 * (1 + inbreeding(a, depth));
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    const hit = kinCache.get(key);
    if (hit !== undefined) return hit;
    // Expand the individual that is NOT an ancestor of the other.
    let young = b;
    let old = a;
    if (ancestors(a).has(b)) {
      young = a;
      old = b;
    }
    const y = lookup(young);
    const v = 0.5 * (kinship(old, y?.sireId, depth + 1) + kinship(old, y?.damId, depth + 1));
    kinCache.set(key, v);
    return v;
  }

  return {
    kinship: (a: number, b: number) => kinship(a, b),
    /** COI an offspring of sire × dam would have. */
    offspringCOI: (sireId: number, damId: number) => kinship(sireId, damId),
    birdCOI: (id: number) => inbreeding(id, 0),
  };
}

export function coiAdvice(coi: number): { level: 'low' | 'moderate' | 'high' | 'very-high'; text: string } {
  const pct = coi * 100;
  if (pct < 6.25) return { level: 'low', text: 'Low relationship. Comparable to an outcross or a distant line cross.' };
  if (pct < 12.5) return { level: 'moderate', text: 'Moderate. Similar to a half-sibling or cousin mating (line breeding).' };
  if (pct < 25) return { level: 'high', text: 'High. Close line breeding. Watch for lower hatch rate and vigor; keep strict culling.' };
  return { level: 'very-high', text: 'Very high. Full-sibling or parent × offspring level. Use only deliberately and briefly.' };
}
