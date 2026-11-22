import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type FeedPlan } from '../db';
import { useBirds } from '../hooks';
import { BirdMultiPicker, Card, Field } from '../components';
import { INGREDIENTS, mixVerdict, stageForAge } from '../lib/feeding';
import { planToSteps, sortedStages, stageOffset, stageProtein, type FeedItem, type FeedPlanStage } from '../lib/feedplan';
import { addDays, fmt, today } from '../lib/dates';
import { startRun } from '../schedule';

const unitWord = (u: FeedPlan['unit']) => (u === 'weeks' ? 'Week' : 'Day');

function StageView({ st, unit, start, next }: { st: FeedPlanStage; unit: FeedPlan['unit']; start?: string; next?: FeedPlanStage }) {
  const p = stageProtein(st);
  const total = st.items.reduce((a, i) => a + (i.parts > 0 ? i.parts : 0), 0);
  return (
    <li>
      <div className="tl-head">
        <b>{st.name}</b>
        <span className="small muted">{unitWord(unit)} {st.from}{next ? `–${next.from - 1}` : '+'}{start ? ` · ${fmt(addDays(start, stageOffset(unit, st.from)))}` : ''}</span>
      </div>
      {total > 0 && (
        <div className="small">
          {st.items.filter((i) => i.parts > 0).map((i) => `${i.name} ${Math.round((i.parts / total) * 100)}%`).join(' · ')}
          {p != null && <b> ≈ {p.toFixed(1)}% protein</b>}
        </div>
      )}
      <div className="small muted">
        {[st.gramsPerBird && `${st.gramsPerBird} g/bird/day`, st.feedingsPerDay && `${st.feedingsPerDay}× a day`].filter(Boolean).join(' · ')}
      </div>
      {st.notes && <div className="small">{st.notes}</div>}
    </li>
  );
}

export function FeedPlanList() {
  const plans = useLiveQuery(() => db.feedPlans.toArray(), []);
  return (
    <Card>
      <div className="row-between">
        <h2>My feeding plans</h2>
        <Link to="/feedplans/new" className="btn small">+ New plan</Link>
      </div>
      {plans && !plans.length && <p className="small muted">Write down your own feeding program once (stages, mixes, amounts), then start it for any bird or pen. You get a reminder at every feed change.</p>}
      {plans?.map((p) => (
        <Link key={p.id} to={`/feedplans/${p.id}`} className="row-link">
          <div><b>{p.name}</b><div className="small muted">{p.stages.length} stage{p.stages.length === 1 ? '' : 's'}{p.description ? ` · ${p.description}` : ''}</div></div>
          <span className="small">→</span>
        </Link>
      ))}
    </Card>
  );
}

export function FeedPlanDetail() {
  const id = Number(useParams().id);
  const nav = useNavigate();
  const { birds } = useBirds();
  const plan = useLiveQuery(() => db.feedPlans.get(id), [id]);
  const [start, setStart] = useState(today());
  const [birdIds, setBirdIds] = useState<number[]>([]);
  const [group, setGroup] = useState('');
  const [time, setTime] = useState('07:00');
  if (plan === undefined) return null;
  if (!plan) return <p className="muted">Plan not found.</p>;
  const stages = sortedStages(plan);

  function pickBirds(ids: number[]) {
    setBirdIds(ids);
    // Age-based plans usually start at hatch: default the start date to the first bird's hatch date.
    const first = birds?.find((b) => b.id === ids[0]);
    if (plan!.unit === 'weeks' && ids.length === 1 && first?.hatchDate) setStart(first.hatchDate);
  }

  async function go(e: FormEvent) {
    e.preventDefault();
    const runId = await startRun({ programKey: `feed:${id}`, name: `Feeding: ${plan!.name}`, steps: planToSteps(plan!, time), startDate: start, birdIds, group: group.trim() || undefined });
    nav(`/runs/${runId}`, { replace: true });
  }

  return (
    <div className="stack">
      <Link to="/feeding" className="small">← Feeding</Link>
      <div className="row-between">
        <h1>{plan.name}</h1>
        <Link to={`/feedplans/${id}/edit`} className="btn small">Edit</Link>
      </div>
      {plan.description && <p className="muted">{plan.description}</p>}

      <Card>
        <h2>Stages</h2>
        <ol className="timeline">
          {stages.map((st, i) => <StageView key={i} st={st} unit={plan.unit} start={start} next={stages[i + 1]} />)}
        </ol>
      </Card>

      <form onSubmit={go}>
        <Card>
          <h2>Start this plan</h2>
          <Field label="Birds" group><BirdMultiPicker birds={birds ?? []} value={birdIds} onChange={pickBirds} /></Field>
          <Field label="Group / pen (optional)"><input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="e.g. 2026 stags" /></Field>
          <div className="grid2">
            <Field label={`${unitWord(plan.unit)} 1 date`} hint={plan.unit === 'weeks' ? 'Usually the hatch date' : undefined}>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
            </Field>
            <Field label="Reminder time"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
          </div>
          <button className="btn primary" disabled={!stages.length}>Start: {stages.length} feed-change reminder{stages.length === 1 ? '' : 's'}</button>
        </Card>
      </form>
    </div>
  );
}

type ItemDraft = { name: string; protein: string; parts: string };
type StageDraft = { name: string; from: string; items: ItemDraft[]; grams: string; feedings: string; notes: string };

const blankItem = (): ItemDraft => ({ name: '', protein: '', parts: '' });
const blankStage = (from = '1'): StageDraft => ({ name: '', from, items: [blankItem()], grams: '', feedings: '', notes: '' });

function toDraft(st: FeedPlanStage): StageDraft {
  return {
    name: st.name, from: String(st.from), grams: st.gramsPerBird ? String(st.gramsPerBird) : '', feedings: st.feedingsPerDay ? String(st.feedingsPerDay) : '',
    notes: st.notes ?? '', items: st.items.length ? st.items.map((i) => ({ name: i.name, protein: String(i.protein), parts: String(i.parts) })) : [blankItem()],
  };
}

function draftItems(items: ItemDraft[]): FeedItem[] {
  return items.filter((i) => i.name.trim()).map((i) => ({ name: i.name.trim(), protein: Number(i.protein) || 0, parts: Number(i.parts) || 0 }));
}

export function FeedPlanEditor() {
  const { id: idParam } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const id = idParam ? Number(idParam) : undefined;
  const existing = useLiveQuery(() => (id ? db.feedPlans.get(id) : undefined), [id]);
  const [form, setForm] = useState<{ name: string; desc: string; unit: FeedPlan['unit']; stages: StageDraft[] } | null>(null);
  const [err, setErr] = useState('');

  if (id && existing === undefined) return null;
  const f = form ?? (existing
    ? { name: existing.name, desc: existing.description ?? '', unit: existing.unit, stages: existing.stages.map(toDraft) }
    : { name: sp.get('name') ?? '', desc: '', unit: 'weeks' as const, stages: [blankStage()] });
  const up = (patch: Partial<typeof f>) => setForm({ ...f, ...patch });
  const setStage = (i: number, patch: Partial<StageDraft>) => up({ stages: f.stages.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const setItem = (si: number, ii: number, patch: Partial<ItemDraft>) =>
    setStage(si, { items: f.stages[si].items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) });

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return setErr('Give the plan a name.');
    const stages: FeedPlanStage[] = f.stages.filter((s) => s.name.trim()).map((s) => ({
      name: s.name.trim(), from: Math.max(1, Number(s.from) || 1), items: draftItems(s.items),
      gramsPerBird: Number(s.grams) || undefined, feedingsPerDay: Number(s.feedings) || undefined, notes: s.notes.trim() || undefined,
    }));
    if (!stages.length) return setErr('Add at least one stage with a name.');
    const starts = stages.map((s) => s.from);
    if (new Set(starts).size !== starts.length) return setErr(`Two stages start on the same ${f.unit === 'weeks' ? 'week' : 'day'}.`);
    const rec = { name: f.name.trim(), description: f.desc.trim() || undefined, unit: f.unit, stages };
    if (id) { await db.feedPlans.update(id, rec); nav(`/feedplans/${id}`, { replace: true }); }
    else { const nid = await db.feedPlans.add({ ...rec, createdAt: Date.now() } as FeedPlan); nav(`/feedplans/${nid}`, { replace: true }); }
  }

  async function remove() {
    if (!confirm('Delete this feeding plan? Plans already started keep their reminders.')) return;
    await db.feedPlans.delete(id!);
    nav('/feeding', { replace: true });
  }

  return (
    <form className="stack" onSubmit={save}>
      <h1>{id ? 'Edit feeding plan' : 'New feeding plan'}</h1>
      <Card>
        <Field label="Plan name"><input value={f.name} onChange={(e) => up({ name: e.target.value })} autoFocus={!id} placeholder="e.g. My stag feeding program" /></Field>
        <Field label="Description (optional)"><input value={f.desc} onChange={(e) => up({ desc: e.target.value })} /></Field>
        <Field label="Count stages in" group>
          <div className="seg">
            <button type="button" className={f.unit === 'weeks' ? 'on' : ''} onClick={() => up({ unit: 'weeks' })}>Weeks (age)</button>
            <button type="button" className={f.unit === 'days' ? 'on' : ''} onClick={() => up({ unit: 'days' })}>Days</button>
          </div>
        </Field>
      </Card>

      <datalist id="feed-names">{INGREDIENTS.filter((i) => !i.custom).map((i) => <option key={i.id} value={i.name} />)}</datalist>

      {f.stages.map((s, si) => {
        const p = stageProtein({ name: '', from: 1, items: draftItems(s.items) });
        return (
          <Card key={si}>
            <div className="row-between">
              <h2>Stage {si + 1}</h2>
              <div className="actions">
                <button type="button" className="link-btn small neutral" onClick={() => up({ stages: [...f.stages.slice(0, si + 1), { ...s, name: `${s.name} (copy)`, from: String((Number(s.from) || 1) + 1) }, ...f.stages.slice(si + 1)] })}>Duplicate</button>
                {f.stages.length > 1 && <button type="button" className="link-btn small" onClick={() => up({ stages: f.stages.filter((_, j) => j !== si) })}>Remove</button>}
              </div>
            </div>
            <div className="grid2">
              <Field label="Stage name"><input value={s.name} onChange={(e) => setStage(si, { name: e.target.value })} placeholder="e.g. Grower" /></Field>
              <Field label={`Starts ${f.unit === 'weeks' ? 'week' : 'day'}`}><input type="number" inputMode="numeric" min={1} value={s.from} onChange={(e) => setStage(si, { from: e.target.value })} /></Field>
            </div>
            <div className="mix">
              <div className="mix-head small muted"><span>Feed</span><span>Protein %</span><span>Parts</span></div>
              {s.items.map((it, ii) => (
                <div key={ii} className="mix-row">
                  <input list="feed-names" aria-label={`Stage ${si + 1} feed ${ii + 1}`} value={it.name} placeholder="Feed name / brand"
                    onChange={(e) => {
                      const known = INGREDIENTS.find((x) => x.name === e.target.value);
                      setItem(si, ii, { name: e.target.value, ...(known && !it.protein ? { protein: String(known.protein) } : {}) });
                    }} />
                  <input aria-label={`Stage ${si + 1} feed ${ii + 1} protein`} type="number" inputMode="decimal" step="0.5" min="0" value={it.protein} onChange={(e) => setItem(si, ii, { protein: e.target.value })} />
                  <input aria-label={`Stage ${si + 1} feed ${ii + 1} parts`} type="number" inputMode="decimal" min="0" step="any" value={it.parts} onChange={(e) => setItem(si, ii, { parts: e.target.value })} />
                </div>
              ))}
            </div>
            <div className="row-between">
              <button type="button" className="btn small" onClick={() => setStage(si, { items: [...s.items, blankItem()] })}>+ Feed</button>
              <span className="small">{p != null ? <>Mix ≈ <b>{p.toFixed(1)}%</b> protein</> : <span className="muted">Add feeds to see protein</span>}</span>
            </div>
            {f.unit === 'weeks' && (() => {
              const ref = stageForAge(Math.max(0, (Number(s.from) || 1) - 1), 'U');
              const v = p != null ? mixVerdict(p, ref.protein) : null;
              return (
                <p className={`hint ref-${v ?? 'none'}`}>
                  Reference for week {Number(s.from) || 1} ({ref.name}): {ref.protein[0]}–{ref.protein[1]}% protein
                  {v === 'low' && ' · your mix is below this'}{v === 'high' && ' · your mix is above this'}{v === 'ok' && ' ✓'}
                </p>
              );
            })()}
            <div className="grid2" style={{ marginTop: 12 }}>
              <Field label="Grams per bird/day"><input type="number" inputMode="numeric" min={0} value={s.grams} onChange={(e) => setStage(si, { grams: e.target.value })} placeholder="optional" /></Field>
              <Field label="Feedings per day"><input type="number" inputMode="numeric" min={0} value={s.feedings} onChange={(e) => setStage(si, { feedings: e.target.value })} placeholder="optional" /></Field>
            </div>
            <Field label="Notes"><input value={s.notes} onChange={(e) => setStage(si, { notes: e.target.value })} placeholder="Greens, grit, water, supplements…" /></Field>
          </Card>
        );
      })}
      <button type="button" className="btn" onClick={() => {
        const last = f.stages[f.stages.length - 1];
        up({ stages: [...f.stages, blankStage(String((Number(last?.from) || 0) + (f.unit === 'weeks' ? 4 : 7)))] });
      }}>+ Add stage</button>
      <p className="hint">Protein for built-in feeds fills in automatically when you pick one from the list. For commercial feeds and brands, type the crude protein % from the sack.</p>
      {err && <p className="error">{err}</p>}
      <div className="actions sticky">
        {id && <button type="button" className="btn danger ghost" onClick={remove}>Delete</button>}
        <button type="button" className="btn ghost" onClick={() => nav(-1)}>Cancel</button>
        <button className="btn primary">Save plan</button>
      </div>
    </form>
  );
}
