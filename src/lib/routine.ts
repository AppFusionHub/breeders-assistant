import type { ProgramPhase, ProgramStep } from '../db';

export const PHASE_TONES = ['red', 'gold', 'green', 'blue', 'plum', 'gray'] as const;
export const DEFAULT_TYPES = ['Medicine', 'Vitamins', 'Feeding', 'Exercise', 'Rest', 'Cleaning', 'Observation', 'Other'];

/** "4AM", "4:30 pm", "16:00", "6pm" → "HH:MM" (null if not a time). */
export function parseTime(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const ap = m[3]?.toLowerCase().replace(/\./g, '');
  if (!m[2] && !ap) return null; // a bare number is not a time
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export interface ParseResult { steps: ProgramStep[]; errors: { line: number; text: string; message: string }[] }

/**
 * One step per line:  Day 3 4AM [Type] Title - notes
 * Day ranges repeat daily: "Day 3-7 6:00 Title". Time, [type] and "- notes" are optional.
 */
export function parseStepLines(text: string, defaultTime = '07:00'): ParseResult {
  const steps: ProgramStep[] = [], errors: ParseResult['errors'] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const m = line.match(/^(?:day|d)\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?[\s:.,]+(.*)$/i);
    if (!m) { errors.push({ line: i + 1, text: line, message: 'Start the line with "Day" and a number, e.g. Day 3' }); return; }
    const from = Number(m[1]), to = m[2] ? Number(m[2]) : undefined;
    if (from < 1 || (to != null && to < from)) { errors.push({ line: i + 1, text: line, message: 'Check the day numbers' }); return; }
    let rest = m[3].trim();
    let time = defaultTime;
    const tm = rest.match(/^(\d{1,2}(?::\d{2})?\s*(?:[ap]\.?m\.?)?)(?=\s|$)/i);
    if (tm) { const t = parseTime(tm[1]); if (t) { time = t; rest = rest.slice(tm[0].length).trim(); } }
    let type: string | undefined;
    const ty = rest.match(/^\[([^\]]{1,30})\]\s*/);
    if (ty) { type = ty[1].trim(); rest = rest.slice(ty[0].length); }
    const parts = rest.split(/\s+[-–—]\s+/);
    const title = parts.shift()!.trim();
    const notes = parts.join(' - ').trim() || undefined;
    if (!title) { errors.push({ line: i + 1, text: line, message: 'Missing what to do' }); return; }
    steps.push({ day: from - 1, lastDay: to != null && to > from ? to - 1 : undefined, everyDays: to != null && to > from ? 1 : undefined, time, title, notes, type });
  });
  return { steps, errors };
}

/** Steps grouped by 1-based day number, each day sorted by time. */
export function groupByDay(steps: ProgramStep[]): { day: number; steps: ProgramStep[] }[] {
  const m = new Map<number, ProgramStep[]>();
  for (const s of steps) m.set(s.day + 1, [...(m.get(s.day + 1) ?? []), s]);
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([day, st]) => ({ day, steps: st.sort((a, b) => a.time.localeCompare(b.time)) }));
}

export function phaseForDay(phases: ProgramPhase[] | undefined, day: number): ProgramPhase | undefined {
  return phases?.find((p) => day >= p.fromDay && day <= p.toDay);
}

/** Days with their phase, with a phase header wherever the phase changes. */
export function dayBoard(steps: ProgramStep[], phases?: ProgramPhase[]) {
  let prev: ProgramPhase | undefined | null = null;
  return groupByDay(steps).map((g) => {
    const phase = phaseForDay(phases, g.day);
    const header = phase !== prev ? phase : undefined;
    prev = phase;
    return { ...g, phase, header };
  });
}

/** 12-hour label for display, matching how breeders write times. */
export function time12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ap = h < 12 ? 'AM' : 'PM';
  const hh = h % 12 || 12;
  return m ? `${hh}:${String(m).padStart(2, '0')} ${ap}` : `${hh} ${ap}`;
}
