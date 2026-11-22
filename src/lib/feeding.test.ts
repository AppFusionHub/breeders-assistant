import { describe, expect, it } from 'vitest';
import { mixProtein, mixVerdict, stageForAge } from './feeding';

describe('feed mix', () => {
  it('weights protein by share', () => {
    // 70% of 16% pellets + 30% corn at 8.5% = 13.75%
    expect(mixProtein([{ share: 70, protein: 16 }, { share: 30, protein: 8.5 }])).toBeCloseTo(13.75);
  });
  it('normalizes shares that do not add to 100', () => {
    expect(mixProtein([{ share: 2, protein: 20 }, { share: 2, protein: 10 }])).toBeCloseTo(15);
  });
  it('PCAARRD farm mix (50 darak / 20 corn / 30 copra) ≈ 13.7%', () => {
    expect(mixProtein([{ share: 50, protein: 12 }, { share: 20, protein: 8.5 }, { share: 30, protein: 20 }])).toBeCloseTo(13.7);
  });
  it('returns null for empty mix and judges against target', () => {
    expect(mixProtein([{ share: 0, protein: 20 }])).toBeNull();
    expect(mixVerdict(13.75, [14, 16])).toBe('low');
    expect(mixVerdict(15, [14, 16])).toBe('ok');
    expect(mixVerdict(19, [14, 16])).toBe('high');
  });
});

describe('stage by age', () => {
  it('maps ages to stages', () => {
    expect(stageForAge(2, 'U').id).toBe('chick');
    expect(stageForAge(10, 'M').id).toBe('grower');
    expect(stageForAge(25, 'F').id).toBe('developer');
    expect(stageForAge(60, 'M').id).toBe('maintenance');
  });
});
