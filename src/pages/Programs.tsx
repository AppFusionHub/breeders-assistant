import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Bird, type Program, type ProgramRun, type ProgramStep, type Reminder } from '../db';
import { useBirds } from '../hooks';
import { BirdMultiPicker, Card, Empty, Field } from '../components';
import { addDays, fmt, today } from '../lib/dates';
import { BUILTIN_PROGRAMS, builtinByKey } from '../programs';
import { downloadICS, startRun, stopRun } from '../schedule';
import { googleCalendarUrl, occurrenceCount, repeatLabel } from '../lib/reminders';
import { whoLabel } from './Reminders';

function stepWhen(s: ProgramStep): string {
  const d = (n: number) => `Day ${n + 1}`;
  if (s.lastDay != null && s.lastDay > s.day) {
    const every = s.everyDays ?? 1;
    return `${d(s.day)}–${s.lastDay + 1}, ${every === 1 ? 'daily' : every === 7 ? 'weekly' : `every ${every} days`}`;
  }
  return d(s.day);
}

export function StepList({ steps, start }: { steps: ProgramStep[]; start?: string }) {
  const sorted = [...steps].sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
  return (
    <ol className="timeline">
      {sorted.map((s, i) => (
        <li key={i}>
          <div className="tl-head"><b>{s.title}</b><span className="small muted">{start ? fmt(addDays(start, s.day)) : ''}</span></div>
          <div className="small muted">{stepWhen(s)} · {s.time}</div>
          {s.notes && <div className="small">{s.notes}</div>}
        </li>
      ))}
    </ol>
  );
}

export default function Programs() {
  const custom = useLiveQuery(() => db.programs.toArray(), []);
  return (
    <div className="stack">
      <h1>Programs & routines</h1>
      <p className="small muted">Starting a program creates its reminders for the birds or pen you choose. You can add them all to your phone's calendar for alarms.</p>
      <h2 className="eyebrow">Breeding season</h2>
      {BUILTIN_PROGRAMS.map((p) => (
        <Link key={p.slug} to={`/programs/builtin:${p.slug}`} className="card guide-card">
          <b>{p.name}</b>
          <span className="small muted">{p.summary}</span>
        </Link>
      ))}
      <div className="row-between">
        <h2 className="eyebrow">My routines</h2>
        <Link to="/programs/new" className="btn small">+ New routine</Link>
      </div>
      {custom && !custom.length && <Empty>Build your own multi-day routine once, then start it for any bird or pen with one tap.</Empty>}
      {custom?.map((p) => (
        <Link key={p.id} to={`/programs/custom:${p.id}`} className="card guide-card">
          <b>{p.name}</b>
          <span className="small muted">{p.steps.length} steps{p.description ? ` · ${p.description}` : ''}</span>
        </Link>
      ))}
    </div>
  );
}

export function ProgramDetail() {
  const key = useParams().key!;
  const nav = useNavigate();
  const { birds } = useBirds();
  const builtin = builtinByKey(key);
  const custom = useLiveQuery(() => (key.startsWith('custom:') ? db.programs.get(Number(key.slice(7))) : undefined), [key]);
  const [start, setStart] = useState(today());
  const [birdIds, setBirdIds] = useState<number[]>([]);
  const [group, setGroup] = useState('');

  const prog = builtin ?? (custom ? { name: custom.name, summary: custom.description ?? '', steps: custom.steps } : null);
  if (!prog) return key.startsWith('custom:') && custom === undefined ? null : <p className="muted">Program not found.</p>;

  async function go(e: FormEvent) {
    e.preventDefault();
    const runId = await startRun({ programKey: key, name: prog!.name, steps: prog!.steps, startDate: start, birdIds, group: group.trim() || undefined });
    nav(`/runs/${runId}`, { replace: true });
  }

  return (
    <div className="stack">
      <Link to="/programs" className="small">← Programs</Link>
      <div className="row-between">
        <h1>{prog.name}</h1>
        {custom && <Link to={`/programs/${key}/edit`} className="btn small">Edit</Link>}
      </div>
      {prog.summary && <p className="muted">{prog.summary}</p>}

      <form onSubmit={go}>
        <Card>
          <h2>Start this program</h2>
          {builtin && <p className="small">{builtin.startHint}</p>}
          <Field label="Start date (day 1)"><input type="date" value={start} onChange={(e) => setStart(e.target.value)} required /></Field>
          <Field label="Birds" group><BirdMultiPicker birds={birds ?? []} value={birdIds} onChange={setBirdIds} /></Field>
          <Field label="Group / pen (optional)"><input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="e.g. Breeding pen 1" /></Field>
          <button className="btn primary" disabled={!prog.steps.length}>Start: create {prog.steps.length} reminders</button>
        </Card>
      </form>

      <Card>
        <h2>Steps</h2>
        <StepList steps={prog.steps} start={start} />
      </Card>

      {builtin && (
        <div className="small">
          <p className="muted">General guidance only. Medicine and vaccine choices, doses and withdrawal periods should come from the product label and your veterinarian.</p>
          <b>Sources</b>
          <ul>{builtin.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>)}</ul>
          {builtin.guideSlug && <Link to={`/guides/${builtin.guideSlug}`}>Related guide →</Link>}
        </div>
      )}
    </div>
  );
}

type StepDraft = { day: string; lastDay: string; everyDays: string; time: string; title: string; notes: string };
const blankStep: StepDraft = { day: '1', lastDay: '', everyDays: '1', time: '07:00', title: '', notes: '' };

export function ProgramEditor() {
  const { key } = useParams();
  const nav = useNavigate();
  const id = key?.startsWith('custom:') ? Number(key.slice(7)) : undefined;
  const existing = useLiveQuery(() => (id ? db.programs.get(id) : undefined), [id]);
  const [name, setName] = useState<string | null>(null);
  const [desc, setDesc] = useState<string | null>(null);
  const [steps, setSteps] = useState<StepDraft[] | null>(null);
  const [err, setErr] = useState('');

  if (id && existing === undefined) return null;
  const n = name ?? existing?.name ?? '';
  const ds = desc ?? existing?.description ?? '';
  const st = steps ?? (existing?.steps.map((s) => ({
    day: String(s.day + 1), lastDay: s.lastDay != null ? String(s.lastDay + 1) : '', everyDays: String(s.everyDays ?? 1),
    time: s.time, title: s.title, notes: s.notes ?? '',
  })) ?? [{ ...blankStep }]);
  const setStep = (i: number, patch: Partial<StepDraft>) => setSteps(st.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!n.trim()) return setErr('Give the routine a name.');
    const clean = st.filter((s) => s.title.trim());
    if (!clean.length) return setErr('Add at least one step with a title.');
    const out: ProgramStep[] = [];
    for (const s of clean) {
      const day = Math.max(1, Number(s.day) || 1) - 1;
      const last = s.lastDay ? Math.max(1, Number(s.lastDay)) - 1 : undefined;
      if (last != null && last < day) return setErr(`"${s.title}": end day is before start day.`);
      out.push({ day, lastDay: last != null && last > day ? last : undefined, everyDays: last != null && last > day ? Math.max(1, Number(s.everyDays) || 1) : undefined,
        time: s.time || '07:00', title: s.title.trim(), notes: s.notes.trim() || undefined });
    }
    const rec = { name: n.trim(), description: ds.trim() || undefined, steps: out };
    if (id) { await db.programs.update(id, rec); nav(`/programs/custom:${id}`, { replace: true }); }
    else { const nid = await db.programs.add({ ...rec, createdAt: Date.now() } as Program); nav(`/programs/custom:${nid}`, { replace: true }); }
  }

  async function remove() {
    if (!confirm('Delete this routine? Programs already started keep their reminders.')) return;
    await db.programs.delete(id!);
    nav('/programs', { replace: true });
  }

  return (
    <form className="stack" onSubmit={save}>
      <h1>{id ? 'Edit routine' : 'New routine'}</h1>
      <Card>
        <Field label="Name"><input value={n} onChange={(e) => setName(e.target.value)} autoFocus={!id} placeholder="e.g. My vitamin routine" /></Field>
        <Field label="Description (optional)"><input value={ds} onChange={(e) => setDesc(e.target.value)} /></Field>
      </Card>
      {st.map((s, i) => (
        <Card key={i}>
          <div className="row-between"><h2>Step {i + 1}</h2>
            {st.length > 1 && <button type="button" className="link-btn small" onClick={() => setSteps(st.filter((_, j) => j !== i))}>Remove</button>}
          </div>
          <Field label="What to do"><input value={s.title} onChange={(e) => setStep(i, { title: e.target.value })} /></Field>
          <div className="grid2">
            <Field label="Day"><input type="number" inputMode="numeric" min={1} value={s.day} onChange={(e) => setStep(i, { day: e.target.value })} /></Field>
            <Field label="Time"><input type="time" value={s.time} onChange={(e) => setStep(i, { time: e.target.value })} /></Field>
          </div>
          <div className="grid2">
            <Field label="Repeat until day" hint="Blank = once"><input type="number" inputMode="numeric" min={1} value={s.lastDay} onChange={(e) => setStep(i, { lastDay: e.target.value })} /></Field>
            {s.lastDay && <Field label="Every N days"><input type="number" inputMode="numeric" min={1} value={s.everyDays} onChange={(e) => setStep(i, { everyDays: e.target.value })} /></Field>}
          </div>
          <Field label="Notes"><input value={s.notes} onChange={(e) => setStep(i, { notes: e.target.value })} /></Field>
        </Card>
      ))}
      <button type="button" className="btn" onClick={() => { const last = st[st.length - 1]; setSteps([...st, { ...blankStep, day: last?.day ?? '1', time: last?.time ?? '07:00' }]); }}>+ Add step</button>
      {err && <p className="error">{err}</p>}
      <div className="actions sticky">
        {id && <button type="button" className="btn danger ghost" onClick={remove}>Delete</button>}
        <button type="button" className="btn ghost" onClick={() => nav(-1)}>Cancel</button>
        <button className="btn primary">Save routine</button>
      </div>
    </form>
  );
}

export function RunDetail() {
  const id = Number(useParams().id);
  const nav = useNavigate();
  const { map } = useBirds();
  const run = useLiveQuery(() => db.runs.get(id), [id]);
  const rems = useLiveQuery(() => db.reminders.where('runId').equals(id).toArray(), [id]);
  const doneCount = useLiveQuery(async () => {
    const ids = (await db.reminders.where('runId').equals(id).primaryKeys()) as number[];
    return db.reminderDone.where('reminderId').anyOf(ids).count();
  }, [id]);
  if (run === undefined || !rems) return null;
  if (!run) return <p className="muted">Program not found.</p>;

  return (
    <RunView run={run} rems={rems} doneCount={doneCount ?? 0} map={map}
      onStop={async () => { if (confirm('Stop this program? Its reminders will be turned off.')) { await stopRun(id); nav('/reminders', { replace: true }); } }} />
  );
}

function RunView({ run, rems, doneCount, map, onStop }: { run: ProgramRun; rems: Reminder[]; doneCount: number; map: Map<number, Bird>; onStop: () => void }) {
  const total = rems.reduce((a, r) => a + (Number.isFinite(occurrenceCount(r)) ? occurrenceCount(r) : 0), 0);
  const sorted = [...rems].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const who = rems[0] ? whoLabel(rems[0], map) : '';
  return (
    <div className="stack">
      <Link to="/reminders" className="small">← Reminders</Link>
      <h1>{run.name}</h1>
      <p className="small muted">Started {fmt(run.startDate)}{who && ` · ${who}`}{run.stopped && ' · stopped'}</p>
      <div className="progress"><div style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }} /></div>
      <p className="small">{doneCount} of {total} tasks done</p>

      {!run.stopped && (
        <Card className="cal-card">
          <h2>⏰ Alarms on your phone</h2>
          <p className="small muted">Add all {rems.length} reminders to your phone's calendar in one go, so they ring even when the app is closed.</p>
          <button className="btn primary" onClick={() => downloadICS(rems, `${run.name.replace(/[^\w]+/g, '-').toLowerCase()}.ics`)}>Add all to calendar (.ics)</button>
          <p className="hint">On Android, open the downloaded file with your Calendar app (Samsung Calendar works; Google Calendar on some phones only imports on the web). You can also add steps one by one to Google Calendar below.</p>
        </Card>
      )}

      <Card>
        <h2>Schedule</h2>
        {sorted.map((r) => (
          <div key={r.id} className="row-link">
            <Link to={`/reminders/${r.id}`} className="grow">
              <b>{r.title}</b>
              <div className="small muted">{fmt(r.date)} · {r.time} · {repeatLabel(r)}</div>
            </Link>
            {!run.stopped && <a className="btn small" href={googleCalendarUrl(r)} target="_blank" rel="noreferrer" aria-label={`Add ${r.title} to Google Calendar`}>+ GCal</a>}
          </div>
        ))}
      </Card>
      {!run.stopped && <button className="btn danger ghost" onClick={onStop}>Stop program</button>}
    </div>
  );
}
