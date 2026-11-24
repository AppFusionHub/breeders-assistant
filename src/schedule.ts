import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ProgramStep, type Reminder } from './db';
import { addDays, today } from './lib/dates';
import { occursOn, toICS } from './lib/reminders';
import { recordsFromReminder } from './lib/health';

export function stepToReminder(step: ProgramStep, start: string) {
  const date = addDays(start, step.day);
  const repeating = step.lastDay != null && step.lastDay > step.day;
  return {
    title: step.title, notes: step.notes, date, time: step.time, logAs: step.logAs, tag: step.type,
    repeat: repeating ? { kind: 'every' as const, days: Math.max(1, step.everyDays ?? 1) } : { kind: 'once' as const },
    endDate: repeating ? addDays(start, step.lastDay!) : undefined,
  };
}

export async function startRun(opts: { programKey: string; name: string; steps: ProgramStep[]; startDate: string; birdIds: number[]; group?: string }) {
  return db.transaction('rw', db.runs, db.reminders, async () => {
    const runId = await db.runs.add({
      programKey: opts.programKey, name: opts.name, startDate: opts.startDate, birdIds: opts.birdIds,
      group: opts.group, createdAt: Date.now(),
    } as never);
    await db.reminders.bulkAdd(opts.steps.map((s) => ({
      ...stepToReminder(s, opts.startDate), birdIds: opts.birdIds, group: opts.group, runId, active: true, createdAt: Date.now(),
    })) as never);
    return runId as number;
  });
}

export async function stopRun(runId: number) {
  await db.transaction('rw', db.runs, db.reminders, async () => {
    await db.runs.update(runId, { stopped: true });
    await db.reminders.where('runId').equals(runId).modify({ active: false });
  });
}

export interface Occurrence { reminder: Reminder; date: string; done: boolean }

/** Occurrences from `from` to `to` inclusive (active reminders only). */
export function useOccurrences(from: string, to: string) {
  return useLiveQuery(async () => {
    const [rems, done] = await Promise.all([
      db.reminders.filter((r) => r.active && r.date <= to && (!r.endDate || r.endDate >= from)).toArray(),
      db.reminderDone.where('date').between(from, to, true, true).toArray(),
    ]);
    const doneSet = new Set(done.map((d) => `${d.reminderId}|${d.date}`));
    const out: Occurrence[] = [];
    for (let d = from; d <= to; d = addDays(d, 1)) {
      for (const r of rems) if (occursOn(r, d)) out.push({ reminder: r, date: d, done: doneSet.has(`${r.id}|${d}`) });
    }
    return out.sort((a, b) => a.date.localeCompare(b.date) || a.reminder.time.localeCompare(b.reminder.time));
  }, [from, to]);
}

/** Today's items plus anything missed in the past 3 days. */
export function useTodayList() {
  const t = today();
  const occ = useOccurrences(addDays(t, -3), t);
  return occ?.filter((o) => o.date === t || !o.done);
}

/** Tick/untick an occurrence. If the reminder records to the health log, add/remove one record per bird. */
export async function toggleDone(reminderId: number, date: string, done: boolean) {
  await db.transaction('rw', db.reminderDone, db.health, db.reminders, async () => {
    if (done) {
      const exists = await db.reminderDone.where('[reminderId+date]').equals([reminderId, date]).first();
      if (exists) return;
      await db.reminderDone.add({ reminderId, date, doneAt: Date.now() } as never);
      const r = await db.reminders.get(reminderId);
      if (r) await db.health.bulkAdd(recordsFromReminder(r, date) as never);
    } else {
      await db.reminderDone.where('[reminderId+date]').equals([reminderId, date]).delete();
      await db.health.where('reminderId').equals(reminderId).filter((h) => h.occDate === date).delete();
    }
  });
}

export function downloadICS(items: Reminder[], filename: string) {
  const ics = toICS(items.map((r) => ({ ...r, uid: `rem-${r.id}-${r.createdAt}` })));
  const blob = new Blob([ics], { type: 'text/calendar' });
  const file = new File([blob], filename, { type: 'text/calendar' });
  if (navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file], title: filename }).catch(() => fallback());
    return;
  }
  fallback();
  function fallback() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
}
