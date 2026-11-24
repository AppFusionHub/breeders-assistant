import { AlarmClock } from 'lucide-react';
import { Fragment, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Bird, type Program, type ProgramPhase, type ProgramRun, type ProgramStep, type Reminder } from '../db';
import { useBirds } from '../hooks';
import { BirdMultiPicker, Card, Empty, Field } from '../components';
import { addDays, fmt, today } from '../lib/dates';
import { BUILTIN_PROGRAMS, builtinByKey } from '../programs';
import { downloadICS, startRun, stopRun } from '../schedule';
import { googleCalendarUrl, occurrenceCount, repeatLabel } from '../lib/reminders';
import { whoLabel } from './Reminders';
import { KINDS, kindLabel } from '../lib/health';
import { DEFAULT_TYPES, PHASE_TONES, dayBoard, parseStepLines, phaseForDay, time12 } from '../lib/routine';
import { Copy, Trash2 } from 'lucide-react';

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
          <div className="small muted">{stepWhen(s)} · {s.time}{s.logAs && <> · <span className={`kind-tag kind-${s.logAs}`}>records {kindLabel(s.logAs).toLowerCase()}</span></>}</div>
          {s.notes && <div className="small">{s.notes}</div>}
        </li>
      ))}
    </ol>
  );
}

export default function Programs() {
  const custom = useLiveQuery(() => db.programs.toArray(), []);
  const groups = useMemo(() => {
    const m = new Map<string, Program[]>();
    for (const p of custom ?? []) { const k = p.category?.trim() || 'My routines'; m.set(k, [...(m.get(k) ?? []), p]); }
    return [...m.entries()].sort((a, b) => (a[0] === 'My routines' ? 1 : b[0] === 'My routines' ? -1 : a[0].localeCompare(b[0])));
  }, [custom]);
  return (
    <div className="stack">
      <div className="page-header">
        <div className="grow"><h1>Programs & routines</h1><p className="small muted">Starting one creates its reminders for the birds or pen you choose.</p></div>
        <Link to="/programs/new" className="btn primary">+ New</Link>
      </div>
      {custom && !custom.length && <Empty>Build your own multi-day routine once, with phases and step types, then start it for any bird or pen with one tap.</Empty>}
      {groups.map(([cat, list]) => (
        <div key={cat} className="stack-sm">
          <h2 className="eyebrow">{cat}</h2>
          {list.map((p) => {
            const days = new Set(p.steps.map((x) => x.day)).size;
            return (
              <Link key={p.id} to={`/programs/custom:${p.id}`} className="card guide-card">
                <b>{p.name}</b>
                <span className="small muted">{days} day{days === 1 ? '' : 's'} · {p.steps.length} steps{p.phases?.length ? ` · ${p.phases.length} phases` : ''}</span>
                {!!p.phases?.length && <span className="phase-strip">{p.phases.map((ph) => <span key={ph.name} className={`tone-${ph.color}`} style={{ flex: Math.max(1, ph.toDay - ph.fromDay + 1) }} title={ph.name} />)}</span>}
              </Link>
            );
          })}
        </div>
      ))}
      <h2 className="eyebrow">Breeding season (built-in)</h2>
      {BUILTIN_PROGRAMS.map((p) => (
        <Link key={p.slug} to={`/programs/builtin:${p.slug}`} className="card guide-card">
          <b>{p.name}</b>
          <span className="small muted">{p.summary}</span>
        </Link>
      ))}
    </div>
  );
}

function repeatText(s: ProgramStep) {
  if (s.lastDay == null || s.lastDay <= s.day) return '';
  const e = s.everyDays ?? 1;
  return `until day ${s.lastDay + 1}${e === 1 ? ', daily' : e === 7 ? ', weekly' : `, every ${e} days`}`;
}

/** Chart-style view: colored phase bands with day cards. */
export function DayBoard({ steps, phases, start }: { steps: ProgramStep[]; phases?: ProgramPhase[]; start?: string }) {
  const board = dayBoard(steps, phases);
  return (
    <div className="board">
      {board.map((d) => (
        <Fragment key={d.day}>
          {d.header && <div className={`phase-band tone-${d.header.color}`}><b>{d.header.name}</b><span>Days {d.header.fromDay}–{d.header.toDay}</span></div>}
          <div className={`day-card ${d.phase ? `edge-${d.phase.color}` : ''}`}>
            <div className="day-head"><b>Day {d.day}</b>{start && <span className="small muted">{fmt(addDays(start, d.day - 1))}</span>}</div>
            {d.steps.map((st, i) => (
              <div key={i} className="day-step">
                <span className="day-time">{time12(st.time)}</span>
                <div className="grow">
                  <b>{st.title}</b>{st.type && <span className="type-tag">{st.type}</span>}
                  {(st.notes || repeatText(st) || st.logAs) && (
                    <div className="small muted">{[st.notes, repeatText(st)].filter(Boolean).join(' · ')}{st.logAs && <> · <span className={`kind-tag kind-${st.logAs}`}>records {kindLabel(st.logAs).toLowerCase()}</span></>}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Fragment>
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

  const prog = builtin ?? (custom ? { name: custom.name, summary: custom.description ?? '', steps: custom.steps, phases: custom.phases, category: custom.category } : null);
  if (!prog) return key.startsWith('custom:') && custom === undefined ? null : <p className="muted">Program not found.</p>;

  async function go(e: FormEvent) {
    e.preventDefault();
    const runId = await startRun({ programKey: key, name: prog!.name, steps: prog!.steps, startDate: start, birdIds, group: group.trim() || undefined });
    nav(`/runs/${runId}`, { replace: true });
  }

  return (
    <div className="stack">
      <div className="row-between">
        <div>{custom?.category && <span className="eyebrow">{custom.category}</span>}<h1>{prog.name}</h1></div>
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

      {custom ? (
        <div className="stack-sm">
          <h2>Schedule</h2>
          <DayBoard steps={custom.steps} phases={custom.phases} start={start} />
        </div>
      ) : (
        <Card>
          <h2>Steps</h2>
          <StepList steps={prog.steps} start={start} />
        </Card>
      )}

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

type StepDraft = { key: number; day: string; lastDay: string; everyDays: string; time: string; title: string; notes: string; logAs: string; type: string };
type PhaseDraft = { key: number; name: string; fromDay: string; toDay: string; color: string };
let keySeq = 1;
const nk = () => keySeq++;
const blankStep = (day = '1', time = '07:00'): StepDraft => ({ key: nk(), day, lastDay: '', everyDays: '1', time, title: '', notes: '', logAs: '', type: '' });
const stepToDraft = (s: ProgramStep): StepDraft => ({
  key: nk(), day: String(s.day + 1), lastDay: s.lastDay != null ? String(s.lastDay + 1) : '', everyDays: String(s.everyDays ?? 1),
  time: s.time, title: s.title, notes: s.notes ?? '', logAs: s.logAs ?? '', type: s.type ?? '',
});
const dayNum = (s: StepDraft) => Math.max(1, Math.floor(Number(s.day)) || 1);

export function ProgramEditor() {
  const { key } = useParams();
  const nav = useNavigate();
  const id = key?.startsWith('custom:') ? Number(key.slice(7)) : undefined;
  const existing = useLiveQuery(() => (id ? db.programs.get(id) : undefined), [id]);
  const all = useLiveQuery(() => db.programs.toArray(), []);
  const [form, setForm] = useState<{ name: string; category: string; desc: string; phases: PhaseDraft[]; steps: StepDraft[] } | null>(null);
  const [paste, setPaste] = useState('');
  const [pasteMsg, setPasteMsg] = useState<{ ok: number; errors: { line: number; text: string; message: string }[] } | null>(null);
  const [err, setErr] = useState('');

  if (id && existing === undefined) return null;
  const f = form ?? (existing ? {
    name: existing.name, category: existing.category ?? '', desc: existing.description ?? '',
    phases: (existing.phases ?? []).map((p) => ({ key: nk(), name: p.name, fromDay: String(p.fromDay), toDay: String(p.toDay), color: p.color })),
    steps: existing.steps.map(stepToDraft),
  } : { name: '', category: '', desc: '', phases: [], steps: [blankStep()] });
  const up = (patch: Partial<typeof f>) => setForm({ ...f, ...patch });
  const setStep = (k: number, patch: Partial<StepDraft>) => up({ steps: f.steps.map((s) => (s.key === k ? { ...s, ...patch } : s)) });
  const setPhase = (k: number, patch: Partial<PhaseDraft>) => up({ phases: f.phases.map((p) => (p.key === k ? { ...p, ...patch } : p)) });

  const categories = [...new Set((all ?? []).map((p) => p.category?.trim()).filter(Boolean))] as string[];
  const types = [...new Set([...(all ?? []).flatMap((p) => p.steps.map((s) => s.type?.trim())), ...f.steps.map((s) => s.type.trim()), ...DEFAULT_TYPES].filter(Boolean))] as string[];
  const phaseList: ProgramPhase[] = f.phases.map((p) => ({ name: p.name, fromDay: Number(p.fromDay) || 1, toDay: Number(p.toDay) || Number(p.fromDay) || 1, color: p.color }));
  const days = [...new Set(f.steps.map(dayNum))].sort((x, y) => x - y);
  const maxDay = days[days.length - 1] ?? 0;

  function importPaste() {
    const r = parseStepLines(paste);
    const drafts = r.steps.map(stepToDraft);
    const keep = f.steps.filter((s) => s.title.trim());
    up({ steps: [...keep, ...drafts] });
    setPasteMsg({ ok: drafts.length, errors: r.errors });
    if (!r.errors.length) setPaste('');
  }
  function copyDay(from: number) {
    const ans = prompt(`Copy all steps of day ${from} to which day?`, String(maxDay + 1));
    const to = Math.floor(Number(ans));
    if (!ans || !(to >= 1)) return;
    const copies = f.steps.filter((s) => dayNum(s) === from).map((s) => {
      const shift = to - from;
      return { ...s, key: nk(), day: String(to), lastDay: s.lastDay ? String(Number(s.lastDay) + shift) : '' };
    });
    up({ steps: [...f.steps, ...copies] });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return setErr('Give the routine a name.');
    const clean = f.steps.filter((s) => s.title.trim());
    if (!clean.length) return setErr('Add at least one step with "What to do" filled in.');
    const out: ProgramStep[] = [];
    for (const s of clean) {
      const day = dayNum(s) - 1;
      const last = s.lastDay ? Math.max(1, Number(s.lastDay)) - 1 : undefined;
      if (last != null && last < day) return setErr(`"${s.title}": repeat-until day is before its start day.`);
      const rep = last != null && last > day;
      out.push({ day, lastDay: rep ? last : undefined, everyDays: rep ? Math.max(1, Number(s.everyDays) || 1) : undefined,
        time: s.time || '07:00', title: s.title.trim(), notes: s.notes.trim() || undefined, logAs: (s.logAs || undefined) as ProgramStep['logAs'], type: s.type.trim() || undefined });
    }
    const phases = f.phases.filter((p) => p.name.trim()).map((p) => {
      const from = Math.max(1, Number(p.fromDay) || 1);
      return { name: p.name.trim(), fromDay: from, toDay: Math.max(from, Number(p.toDay) || from), color: p.color };
    });
    const rec = { name: f.name.trim(), category: f.category.trim() || undefined, description: f.desc.trim() || undefined, phases, steps: out };
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
      <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
      <datalist id="step-types">{types.map((t) => <option key={t} value={t} />)}</datalist>

      <Card>
        <Field label="Name"><input value={f.name} onChange={(e) => up({ name: e.target.value })} autoFocus={!id} placeholder="e.g. My 21-day program" /></Field>
        <Field label="Category" hint="Routines with the same category are grouped together."><input list="cats" value={f.category} onChange={(e) => up({ category: e.target.value })} placeholder="e.g. Conditioning, Health, Feeding" /></Field>
        <Field label="Description (optional)"><input value={f.desc} onChange={(e) => up({ desc: e.target.value })} /></Field>
      </Card>

      <Card>
        <div className="card-head"><h2>Phases</h2><span className="small muted">Optional</span></div>
        <p className="hint">Name each stage of the routine and the days it covers. Each phase gets its own color band.</p>
        {f.phases.map((p) => (
          <div key={p.key} className={`phase-edit edge-${p.color}`}>
            <div className="toolbar">
              <input aria-label="Phase name" value={p.name} onChange={(e) => setPhase(p.key, { name: e.target.value })} placeholder="Phase name" />
              <button type="button" className="icon-btn small-icon" aria-label="Remove phase" onClick={() => up({ phases: f.phases.filter((x) => x.key !== p.key) })}><Trash2 size={18} /></button>
            </div>
            <div className="phase-row">
              <label className="small">Day <input aria-label="Phase from day" type="number" min={1} inputMode="numeric" value={p.fromDay} onChange={(e) => setPhase(p.key, { fromDay: e.target.value })} /></label>
              <label className="small">to <input aria-label="Phase to day" type="number" min={1} inputMode="numeric" value={p.toDay} onChange={(e) => setPhase(p.key, { toDay: e.target.value })} /></label>
              <div className="swatches" role="radiogroup" aria-label="Phase color">
                {PHASE_TONES.map((t) => <button type="button" key={t} role="radio" aria-checked={p.color === t} aria-label={t} className={`swatch tone-${t} ${p.color === t ? 'on' : ''}`} onClick={() => setPhase(p.key, { color: t })} />)}
              </div>
            </div>
          </div>
        ))}
        <button type="button" className="btn small" onClick={() => {
          const last = f.phases[f.phases.length - 1];
          const from = last ? (Number(last.toDay) || 0) + 1 : 1;
          up({ phases: [...f.phases, { key: nk(), name: '', fromDay: String(from), toDay: String(from + 3), color: PHASE_TONES[f.phases.length % PHASE_TONES.length] }] });
        }}>+ Add phase</button>
      </Card>

      <details className="card paste-card">
        <summary><b>Paste steps</b> <span className="small muted">Type or paste many steps at once</span></summary>
        <p className="hint">One step per line: <code>Day 3 4AM [Type] What to do - notes</code>. Time, [type] and notes are optional. Use <code>Day 3-7</code> for a step that repeats daily.</p>
        <textarea rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} aria-label="Paste steps"
          placeholder={'Day 1 6AM [Medicine] Product name - 1 tablet\nDay 1 5PM [Vitamins] Product name - 1 capsule\nDay 2-4 8AM [Rest] Rest day'} />
        <button type="button" className="btn small" disabled={!paste.trim()} onClick={importPaste}>Add these steps</button>
        {pasteMsg && (
          <div className="small" role="status">
            {pasteMsg.ok > 0 && <p className="pos">Added {pasteMsg.ok} step{pasteMsg.ok > 1 ? 's' : ''}.</p>}
            {pasteMsg.errors.map((er) => <p key={er.line} className="danger">Line {er.line}: {er.message} ("{er.text.slice(0, 40)}")</p>)}
          </div>
        )}
      </details>

      {days.map((day) => {
        const ph = phaseForDay(phaseList, day);
        return (
          <Card key={day} className={`day-edit ${ph ? `edge-${ph.color}` : ''}`}>
            <div className="card-head">
              <h2>Day {day}{ph && <span className={`phase-chip tone-${ph.color}`}>{ph.name || 'Phase'}</span>}</h2>
              <button type="button" className="btn small" onClick={() => copyDay(day)}><Copy size={15} /> Copy day</button>
            </div>
            {f.steps.filter((s) => dayNum(s) === day).sort((x, y) => x.time.localeCompare(y.time)).map((s) => (
              <div key={s.key} className="step-edit">
                <div className="step-grid">
                  <input aria-label="Time" type="time" value={s.time} onChange={(e) => setStep(s.key, { time: e.target.value })} />
                  <input aria-label="Type" list="step-types" value={s.type} onChange={(e) => setStep(s.key, { type: e.target.value })} placeholder="Type" />
                </div>
                <input aria-label="What to do" value={s.title} onChange={(e) => setStep(s.key, { title: e.target.value })} placeholder="What to do" />
                <input aria-label="Notes" value={s.notes} onChange={(e) => setStep(s.key, { notes: e.target.value })} placeholder="Notes / dose (optional)" />
                <details className="more">
                  <summary className="small">More: day, repeat, health record</summary>
                  <div className="grid3">
                    <Field label="Day"><input type="number" min={1} inputMode="numeric" value={s.day} onChange={(e) => setStep(s.key, { day: e.target.value })} /></Field>
                    <Field label="Repeat until day"><input type="number" min={1} inputMode="numeric" value={s.lastDay} onChange={(e) => setStep(s.key, { lastDay: e.target.value })} placeholder="once" /></Field>
                    <Field label="Every N days"><input type="number" min={1} inputMode="numeric" value={s.everyDays} onChange={(e) => setStep(s.key, { everyDays: e.target.value })} /></Field>
                  </div>
                  <Field label="Record in each bird's health log as">
                    <select value={s.logAs} onChange={(e) => setStep(s.key, { logAs: e.target.value })}>
                      <option value="">Don't record</option>
                      {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
                    </select>
                  </Field>
                </details>
                <div className="step-actions">
                  <button type="button" className="link-btn neutral small" onClick={() => up({ steps: [...f.steps, { ...s, key: nk() }] })}>Duplicate</button>
                  <button type="button" className="link-btn small" onClick={() => up({ steps: f.steps.filter((x) => x.key !== s.key) })}>Remove</button>
                </div>
              </div>
            ))}
            <button type="button" className="btn small" onClick={() => {
              const same = f.steps.filter((x) => dayNum(x) === day);
              up({ steps: [...f.steps, blankStep(String(day), same[same.length - 1]?.time ?? '07:00')] });
            }}>+ Step on day {day}</button>
          </Card>
        );
      })}
      <button type="button" className="btn" onClick={() => up({ steps: [...f.steps, blankStep(String(maxDay + 1))] })}>+ Add day {maxDay + 1}</button>
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
          <h2 className="h-icon"><AlarmClock size={20} /> Alarms on your phone</h2>
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
              <b>{r.title}</b>{r.tag && <span className="type-tag">{r.tag}</span>}
              <div className="small muted">{fmt(r.date)} · {time12(r.time)} · {repeatLabel(r)}</div>
            </Link>
            {!run.stopped && <a className="btn small" href={googleCalendarUrl(r)} target="_blank" rel="noreferrer" aria-label={`Add ${r.title} to Google Calendar`}>+ GCal</a>}
          </div>
        ))}
      </Card>
      {!run.stopped && <button className="btn danger ghost" onClick={onStop}>Stop program</button>}
    </div>
  );
}
