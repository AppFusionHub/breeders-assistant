import { describe, expect, it } from 'vitest';
import { makeKinship, type PedigreeNode } from './pedigree';

function setup(nodes: PedigreeNode[]) {
  const m = new Map(nodes.map((n) => [n.id, n]));
  return makeKinship((id) => m.get(id));
}

describe('kinship / COI', () => {
  it('unrelated founders give 0', () => {
    const k = setup([{ id: 1 }, { id: 2 }]);
    expect(k.offspringCOI(1, 2)).toBe(0);
  });

  it('full siblings give 25%', () => {
    const k = setup([{ id: 1 }, { id: 2 }, { id: 3, sireId: 1, damId: 2 }, { id: 4, sireId: 1, damId: 2 }]);
    expect(k.offspringCOI(3, 4)).toBeCloseTo(0.25);
  });

  it('half siblings give 12.5%', () => {
    const k = setup([{ id: 1 }, { id: 2 }, { id: 5 }, { id: 3, sireId: 1, damId: 2 }, { id: 4, sireId: 1, damId: 5 }]);
    expect(k.offspringCOI(3, 4)).toBeCloseTo(0.125);
  });

  it('parent × offspring gives 25%', () => {
    const k = setup([{ id: 1 }, { id: 2 }, { id: 3, sireId: 1, damId: 2 }]);
    expect(k.offspringCOI(1, 3)).toBeCloseTo(0.25);
  });

  it('first cousins give 6.25%', () => {
    const k = setup([
      { id: 1 }, { id: 2 }, { id: 7 }, { id: 8 },
      { id: 3, sireId: 1, damId: 2 }, { id: 4, sireId: 1, damId: 2 },
      { id: 5, sireId: 3, damId: 7 }, { id: 6, sireId: 4, damId: 8 },
    ]);
    expect(k.offspringCOI(5, 6)).toBeCloseTo(0.0625);
  });

  it('accounts for inbred common ancestor', () => {
    // 3 is offspring of full sibs (F=0.25); 3's two offspring with unrelated mates are half sibs through an inbred parent.
    const k = setup([
      { id: 1 }, { id: 2 }, { id: 10, sireId: 1, damId: 2 }, { id: 11, sireId: 1, damId: 2 },
      { id: 3, sireId: 10, damId: 11 }, { id: 20 }, { id: 21 },
      { id: 4, sireId: 3, damId: 20 }, { id: 5, sireId: 3, damId: 21 },
    ]);
    expect(k.birdCOI(3)).toBeCloseTo(0.25);
    // half sibs: 0.25 * (1 + F_common) / 2 ... kinship = 1/4 * 0.5*(1+0.25) = 0.15625
    expect(k.offspringCOI(4, 5)).toBeCloseTo(0.15625);
  });
});
