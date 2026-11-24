import { describe, expect, it } from 'vitest';
import { dayBoard, groupByDay, parseStepLines, parseTime, phaseForDay, time12 } from './routine';

describe('parseTime', () => {
  it('reads 12h and 24h formats', () => {
    expect(parseTime('4AM')).toBe('04:00');
    expect(parseTime('6pm')).toBe('18:00');
    expect(parseTime('4:30 p.m.')).toBe('16:30');
    expect(parseTime('12am')).toBe('00:00');
    expect(parseTime('12pm')).toBe('12:00');
    expect(parseTime('16:05')).toBe('16:05');
    expect(parseTime('7')).toBeNull();
    expect(parseTime('25:00')).toBeNull();
  });
  it('formats 12h labels', () => {
    expect(time12('04:00')).toBe('4 AM');
    expect(time12('18:30')).toBe('6:30 PM');
    expect(time12('00:00')).toBe('12 AM');
  });
});

describe('parseStepLines', () => {
  it('parses day, time, type, title and notes', () => {
    const r = parseStepLines('Day 3 4AM [Exercise] Walk in run - 5 minutes\nday 10 6:00 PM Vitamins in water\nD12 Clean pens');
    expect(r.errors).toEqual([]);
    expect(r.steps[0]).toMatchObject({ day: 2, time: '04:00', type: 'Exercise', title: 'Walk in run', notes: '5 minutes' });
    expect(r.steps[1]).toMatchObject({ day: 9, time: '18:00', title: 'Vitamins in water' });
    expect(r.steps[1].type).toBeUndefined();
    expect(r.steps[2]).toMatchObject({ day: 11, time: '07:00', title: 'Clean pens' });
  });
  it('turns day ranges into daily repeats', () => {
    const r = parseStepLines('Day 1-4 6AM [Medicine] Product X - 1 tablet');
    expect(r.steps[0]).toMatchObject({ day: 0, lastDay: 3, everyDays: 1 });
  });
  it('keeps hyphens inside names and reports bad lines', () => {
    const r = parseStepLines('Day 2 B-complex - 1 ml\nWalk birds\nDay 0 x\n# comment\n');
    expect(r.steps).toHaveLength(1);
    expect(r.steps[0]).toMatchObject({ title: 'B-complex', notes: '1 ml' });
    expect(r.errors.map((e) => e.line)).toEqual([2, 3]);
  });
});

describe('board', () => {
  const steps = parseStepLines('Day 2 6AM B\nDay 1 5AM A\nDay 1 4AM A0\nDay 6 C').steps;
  const phases = [{ name: 'Phase one', fromDay: 1, toDay: 4, color: 'red' }, { name: 'Phase two', fromDay: 5, toDay: 10, color: 'blue' }];
  it('groups by day and sorts by time', () => {
    const g = groupByDay(steps);
    expect(g.map((x) => x.day)).toEqual([1, 2, 6]);
    expect(g[0].steps.map((s) => s.title)).toEqual(['A0', 'A']);
  });
  it('assigns phases and headers only where they change', () => {
    expect(phaseForDay(phases, 4)!.name).toBe('Phase one');
    const b = dayBoard(steps, phases);
    expect(b.map((d) => d.header?.name ?? null)).toEqual(['Phase one', null, 'Phase two']);
  });
});
