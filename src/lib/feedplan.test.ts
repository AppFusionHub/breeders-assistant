import { describe, expect, it } from 'vitest';
import { planToSteps, stageAt, stageOffset, stageProtein, stageSummary, type FeedPlanLike } from './feedplan';

const plan: FeedPlanLike = {
  name: 'My grow-out', unit: 'weeks',
  stages: [
    { name: 'Grower', from: 7, items: [{ name: 'Grower pellets', protein: 17, parts: 90 }, { name: 'Mais', protein: 8.5, parts: 10 }], gramsPerBird: 70 },
    { name: 'Chick', from: 1, items: [{ name: 'Booster', protein: 21, parts: 1 }] },
    { name: 'Stag', from: 19, items: [{ name: 'Pellets', protein: 16, parts: 60 }, { name: 'Mais', protein: 8.5, parts: 40 }], feedingsPerDay: 2 },
  ],
};

describe('feed plans', () => {
  it('converts weeks to day offsets', () => {
    expect(stageOffset('weeks', 1)).toBe(0);
    expect(stageOffset('weeks', 7)).toBe(42);
    expect(stageOffset('days', 10)).toBe(9);
  });
  it('finds the current stage regardless of entry order', () => {
    expect(stageAt(plan, -1)).toBeNull();
    expect(stageAt(plan, 0)!.stage.name).toBe('Chick');
    expect(stageAt(plan, 41)!.stage.name).toBe('Chick');
    expect(stageAt(plan, 42)!.stage.name).toBe('Grower');
    expect(stageAt(plan, 42)!.next!.name).toBe('Stag');
    expect(stageAt(plan, 500)!.stage.name).toBe('Stag');
  });
  it('computes stage protein and summary', () => {
    expect(stageProtein(plan.stages[0])).toBeCloseTo(16.15);
    expect(stageSummary(plan.stages[0])).toContain('Grower pellets 90%, Mais 10%');
    expect(stageSummary(plan.stages[0])).toContain('70 g/bird/day');
  });
  it('creates one reminder per feed change in order', () => {
    const steps = planToSteps(plan);
    expect(steps.map((s) => s.day)).toEqual([0, 42, 126]);
    expect(steps[0].title).toBe('Feeding: start "Chick"');
    expect(steps[1].title).toBe('Feeding: switch to "Grower"');
  });
});
