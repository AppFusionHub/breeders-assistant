import { mixProtein } from './feeding';

export interface FeedItem { name: string; protein: number; parts: number }

export interface FeedPlanStage {
  name: string;
  from: number; // in plan units, 1-based (day 1 / week 1 = start)
  items: FeedItem[];
  gramsPerBird?: number; // per day
  feedingsPerDay?: number;
  notes?: string;
}

export interface FeedPlanLike {
  name: string;
  unit: 'days' | 'weeks';
  stages: FeedPlanStage[];
}

/** Day offset (0 = start date) at which a stage begins. */
export function stageOffset(unit: FeedPlanLike['unit'], from: number): number {
  const n = Math.max(1, Math.floor(from));
  return unit === 'weeks' ? (n - 1) * 7 : n - 1;
}

export function sortedStages(plan: FeedPlanLike): FeedPlanStage[] {
  return [...plan.stages].sort((a, b) => stageOffset(plan.unit, a.from) - stageOffset(plan.unit, b.from));
}

/** Which stage applies `dayOffset` days after the plan start (null before day 1). */
export function stageAt(plan: FeedPlanLike, dayOffset: number): { stage: FeedPlanStage; index: number; next?: FeedPlanStage } | null {
  if (dayOffset < 0) return null;
  const s = sortedStages(plan);
  let idx = -1;
  s.forEach((st, i) => { if (stageOffset(plan.unit, st.from) <= dayOffset) idx = i; });
  return idx < 0 ? null : { stage: s[idx], index: idx, next: s[idx + 1] };
}

export function stageProtein(st: FeedPlanStage): number | null {
  return mixProtein(st.items.map((i) => ({ share: i.parts, protein: i.protein })));
}

export function mixText(st: FeedPlanStage): string {
  const total = st.items.reduce((a, i) => a + (i.parts > 0 ? i.parts : 0), 0);
  if (!total) return '';
  return st.items.filter((i) => i.parts > 0).map((i) => `${i.name} ${Math.round((i.parts / total) * 100)}%`).join(', ');
}

export function stageSummary(st: FeedPlanStage): string {
  const p = stageProtein(st);
  const bits = [
    mixText(st) && `Mix: ${mixText(st)}`,
    p != null && `≈${p.toFixed(1)}% protein`,
    st.gramsPerBird && `${st.gramsPerBird} g/bird/day`,
    st.feedingsPerDay && `${st.feedingsPerDay}× a day`,
    st.notes,
  ].filter(Boolean);
  return bits.join(' · ');
}

/** Reminder steps (program-step shape) for each feed change. */
export function planToSteps(plan: FeedPlanLike, time = '07:00') {
  return sortedStages(plan).map((st, i) => ({
    day: stageOffset(plan.unit, st.from),
    time,
    title: i === 0 ? `Feeding: start "${st.name}"` : `Feeding: switch to "${st.name}"`,
    notes: [stageSummary(st), i > 0 ? 'Change gradually over 3–5 days by mixing old and new feed.' : ''].filter(Boolean).join('\n'),
  }));
}
