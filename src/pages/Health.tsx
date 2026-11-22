import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, birdLabel, DEFAULT_PROTOCOL, type HealthEvent, type HealthKind, type ProtocolItem } from '../db';
import { useBirds, useDueHealth } from '../hooks';
import { BirdMultiPicker, Card, Empty, Field } from '../components';
import { ageLabel, fmt, today } from '../lib/dates';
import { KINDS, kindLabel } from '../lib/health';

type Tab = 'due' | 'log' | 'schedule';

export default function Health() {
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get('tab') ?? (sp.get('bird') || sp.get('batch') ? 'log' : 'due')) as Tab;
  const setTab = (t: Tab) => setSp({ tab: t }, { replace: true });
  return (
    <div className="stack">
      <h1>Health</h1>
      <div className="seg wide">
        <button className={tab === 'due' ? 'on' : ''} onClick={() => setTab('due')}>Due</button>
        <button className={tab === 'log' ? 'on' : ''} onClick={() => setTab('log')}>Log</button>
        <button className={tab === 'schedule' ? 'on' : ''} onClick={() => setTab('schedule')}>Schedule</button>
      </div>
      {tab === 'due' && <Due />}
      {tab === 'log' && <Log initialBird={sp.get('bird') ? Number(sp.get('bird')) : undefined} initialBatch={sp.get('batch') ? Number(sp.get('batch')) : undefined} />}
      {tab === 'schedule' && <Schedule />}
    </div>
  );
}

function Due() {
  const due = useDueHealth(21);
  const t = today();
  async function done(birdId: number, protocolId: number, name: string) {
    await db.health.add({ birdId, protocolId, date: t, kind: 'vaccine', product: name } as never);
  }
  async function doneAll(items: NonNullable<typeof due>) {
    if (!confirm(`Mark ${items.length} items as given today?`)) return;
    await db.health.bulkAdd(items.map((d) => ({ birdId: d.bird.id, protocolId: d.protocolId, date: t, kind: 'vaccine' as const, product: d.name })) as never);
  }
  if (!due) return null;
  if (!due.length) return <Empty>Nothing due in the next 3 weeks. Birds need a hatch date to get a schedule.</Empty>;

  const groups = new Map<string, typeof due>();
  for (const d of due) {
    const k = `${d.protocolId}|${d.due}`;
    groups.set(k, [...(groups.get(k) ?? []), d]);
  }
  return (
    <>
      {[...groups.values()].map((items) => (
        <Card key={`${items[0].protocolId}-${items[0].due}`}>
          <div className="row-between">
            <div>
              <b>{items[0].name}</b>
              <div className={`small ${items[0].overdue ? 'danger' : 'muted'}`}>
                {items[0].overdue ? 'Overdue · ' : ''}{fmt(items[0].due)}{items[0].dueEnd !== items[0].due && ` – ${fmt(items[0].dueEnd)}`}
                {items[0].route && ` · ${items[0].route}`}
              </div>
            </div>
            {items.length > 1 && <button className="btn small" onClick={() => doneAll(items)}>All done</button>}
          </div>
          {items.map((d) => (
            <div key={d.bird.id} className="row-link">
              <Link to={`/birds/${d.bird.id}`}>{birdLabel(d.bird)}</Link>
              <button className="btn small" onClick={() => done(d.bird.id, d.protocolId, d.name)}>✓ Given</button>
            </div>
          ))}
        </Card>
      ))}
    </>
  );
}

function Log({ initialBird, initialBatch }: { initialBird?: number; initialBatch?: number }) {
  const { birds, map } = useBirds();
  const events = useLiveQuery(() => db.health.orderBy('date').reverse().limit(100).toArray(), []);
  const batches = useLiveQuery(async () => {
    const all = await db.batches.orderBy('setDate').reverse().toArray();
    const counts = await Promise.all(all.map((b) => db.birds.where('batchId').equals(b.id).filter((x) => x.status === 'active').count()));
    return all.map((b, i) => ({ ...b, chicks: counts[i] })).filter((b) => b.chicks > 0);
  }, []);
  const [birdIds, setBirdIds] = useState<number[]>(initialBird ? [initialBird] : []);
  const [date, setDate] = useState(today());
  const [kind, setKind] = useState<HealthKind>('vitamins');
  const [product, setProduct] = useState('');
  const [dose, setDose] = useState('');
  const [route, setRoute] = useState('');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');
  const active = (birds ?? []).filter((b) => b.status === 'active');

  useEffect(() => {
    if (!initialBatch || !birds) return;
    setBirdIds(birds.filter((b) => b.batchId === initialBatch && b.status === 'active').map((b) => b.id));
  }, [initialBatch, birds]);

  const addIds = (ids: number[]) => setBirdIds((cur) => [...new Set([...cur, ...ids])]);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!birdIds.length || !product.trim()) return;
    const rec = { date, kind, product: product.trim(), dose: dose.trim() || undefined, route: route.trim() || undefined, notes: notes.trim() || undefined };
    await db.health.bulkAdd(birdIds.map((birdId) => ({ ...rec, birdId })) as never);
    setMsg(`Saved to ${birdIds.length} bird${birdIds.length > 1 ? 's' : ''}.`);
    setProduct(''); setDose(''); setNotes('');
  }

  return (
    <>
      <form onSubmit={add}>
        <Card>
          <Field label="Birds" group>
            <BirdMultiPicker birds={active} value={birdIds} onChange={setBirdIds} />
          </Field>
          <div className="chips wrap" style={{ marginTop: -6, marginBottom: 12 }}>
            {batches?.slice(0, 4).map((b) => (
              <button type="button" key={b.id} className="chip" onClick={() => addIds((birds ?? []).filter((x) => x.batchId === b.id && x.status === 'active').map((x) => x.id))}>
                + Chicks: {b.label.split(' · ')[0]} ({b.chicks})
              </button>
            ))}
            {active.length > 0 && <button type="button" className="chip" onClick={() => addIds(active.map((b) => b.id))}>+ All active ({active.length})</button>}
            {birdIds.length > 1 && <button type="button" className="chip" onClick={() => setBirdIds([])}>Clear</button>}
          </div>
          <Field label="Type" group>
            <div className="chips wrap">
              {KINDS.map((k) => <button type="button" key={k.id} className={`chip ${kind === k.id ? 'on' : ''}`} onClick={() => setKind(k.id)}>{k.label}</button>)}
            </div>
          </Field>
          <Field label="Product / what was given"><input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="e.g. brand name of vitamins, dewormer or antibiotic" /></Field>
          <div className="grid2">
            <Field label="Dose"><input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="e.g. 1 ml, 1 tab/L" /></Field>
            <Field label="Route">
              <input list="routes" value={route} onChange={(e) => setRoute(e.target.value)} placeholder="Water, oral…" />
              <datalist id="routes">{['Drinking water', 'Oral (direct)', 'Eye drop', 'Nose drop', 'Injection (IM)', 'Injection (SC)', 'Wing web', 'In feed', 'Topical / spray'].map((r) => <option key={r} value={r} />)}</datalist>
            </Field>
          </div>
          <div className="grid2">
            <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Notes"><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason, vet advice" /></Field>
          </div>
          <button className="btn primary" disabled={!birdIds.length || !product.trim()}>
            Save to {birdIds.length || 0} bird{birdIds.length === 1 ? '' : 's'}
          </button>
          {msg && <p className="small pos" role="status">{msg}</p>}
        </Card>
      </form>
      <Card>
        <h2>Recent records</h2>
        {!events?.length && <p className="muted small">No records yet.</p>}
        {events?.map((h) => (
          <Link key={h.id} to={`/health/record/${h.id}`} className="row-link">
            <div className="grow">
              <b>{h.product}</b> <span className={`kind-tag kind-${h.kind}`}>{kindLabel(h.kind)}</span>
              <div className="small muted">{birdLabel(map.get(h.birdId))}{h.dose && ` · ${h.dose}`}{h.route && ` · ${h.route}`}</div>
            </div>
            <span className="small">{fmt(h.date)}</span>
          </Link>
        ))}
      </Card>
    </>
  );
}

export function HealthRecord() {
  const id = Number(useParams().id);
  const nav = useNavigate();
  const rec = useLiveQuery(() => db.health.get(id), [id]);
  const bird = useLiveQuery(async () => (rec ? db.birds.get(rec.birdId) : undefined), [rec?.birdId]);
  const [d, setD] = useState<HealthEvent | null>(null);
  useEffect(() => { if (rec) setD(rec); }, [rec]);
  if (rec === undefined || !d) return null;
  const up = (patch: Partial<HealthEvent>) => setD({ ...d, ...patch });
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!d!.product.trim()) return;
    await db.health.put({ ...d!, product: d!.product.trim(), dose: d!.dose?.trim() || undefined, route: d!.route?.trim() || undefined, notes: d!.notes?.trim() || undefined });
    nav(-1);
  }
  async function remove() {
    if (!confirm('Delete this health record?')) return;
    await db.health.delete(id);
    nav(-1);
  }
  return (
    <form className="stack" onSubmit={save}>
      <h1>Health record</h1>
      {bird && <p className="muted">For <Link to={`/birds/${bird.id}`}>{birdLabel(bird)}</Link>{bird.hatchDate && ` · age then: ${ageLabel(bird.hatchDate, d.date)}`}</p>}
      <Card>
        <Field label="Type" group>
          <div className="chips wrap">{KINDS.map((k) => <button type="button" key={k.id} className={`chip ${d.kind === k.id ? 'on' : ''}`} onClick={() => up({ kind: k.id })}>{k.label}</button>)}</div>
        </Field>
        <Field label="Product / what was given"><input value={d.product} onChange={(e) => up({ product: e.target.value })} /></Field>
        <div className="grid2">
          <Field label="Dose"><input value={d.dose ?? ''} onChange={(e) => up({ dose: e.target.value })} /></Field>
          <Field label="Route"><input value={d.route ?? ''} onChange={(e) => up({ route: e.target.value })} /></Field>
        </div>
        <Field label="Date"><input type="date" value={d.date} onChange={(e) => up({ date: e.target.value })} /></Field>
        <Field label="Notes"><textarea rows={2} value={d.notes ?? ''} onChange={(e) => up({ notes: e.target.value })} /></Field>
      </Card>
      <div className="actions sticky">
        <button type="button" className="btn danger ghost" onClick={remove}>Delete</button>
        <button type="button" className="btn ghost" onClick={() => nav(-1)}>Cancel</button>
        <button className="btn primary">Save</button>
      </div>
    </form>
  );
}

function Schedule() {
  const items = useLiveQuery(() => db.protocol.orderBy('dayFrom').toArray(), []);
  const [edit, setEdit] = useState<Partial<ProtocolItem> | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit?.name?.trim()) return;
    const from = Number(edit.dayFrom ?? 0);
    const rec = { ...edit, name: edit.name.trim(), dayFrom: from, dayTo: Math.max(from, Number(edit.dayTo ?? from)) };
    if (rec.id) await db.protocol.put(rec as ProtocolItem); else await db.protocol.add(rec as ProtocolItem);
    setEdit(null);
  }
  async function reset() {
    if (!confirm('Restore the default BAI Newcastle schedule? Your custom items will be removed.')) return;
    await db.protocol.clear();
    await db.protocol.bulkAdd(DEFAULT_PROTOCOL as ProtocolItem[]);
  }

  return (
    <>
      <p className="small muted">These items apply to every active bird with a hatch date. Defaults follow the BAI Newcastle disease program for game fowls. Adjust them to your veterinarian's advice. Add fowl pox, deworming and other items here.</p>
      {items?.map((p) => (
        <Card key={p.id}>
          <div className="row-between">
            <div>
              <b>{p.name}</b>
              <div className="small">Day {p.dayFrom}{p.dayTo !== p.dayFrom && `–${p.dayTo}`}{p.route && ` · ${p.route}`}</div>
              {p.notes && <div className="small muted">{p.notes}</div>}
            </div>
            <button className="btn small" onClick={() => setEdit(p)}>Edit</button>
          </div>
        </Card>
      ))}
      {edit ? (
        <form onSubmit={save}>
          <Card>
            <Field label="Name"><input value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus /></Field>
            <div className="grid2">
              <Field label="From age (days)"><input type="number" min={0} value={edit.dayFrom ?? ''} onChange={(e) => setEdit({ ...edit, dayFrom: Number(e.target.value) })} /></Field>
              <Field label="To age (days)"><input type="number" min={0} value={edit.dayTo ?? ''} onChange={(e) => setEdit({ ...edit, dayTo: Number(e.target.value) })} /></Field>
            </div>
            <Field label="Route"><input value={edit.route ?? ''} onChange={(e) => setEdit({ ...edit, route: e.target.value })} placeholder="Eye drop, drinking water, IM, wing web…" /></Field>
            <Field label="Notes"><input value={edit.notes ?? ''} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field>
            <div className="actions">
              {edit.id && <button type="button" className="btn danger ghost" onClick={async () => { await db.protocol.delete(edit.id!); setEdit(null); }}>Delete</button>}
              <button type="button" className="btn ghost" onClick={() => setEdit(null)}>Cancel</button>
              <button className="btn primary">Save</button>
            </div>
          </Card>
        </form>
      ) : (
        <div className="actions">
          <button className="btn" onClick={() => setEdit({ dayFrom: 0, dayTo: 0 })}>+ Add item</button>
          <button className="btn ghost" onClick={reset}>Restore defaults</button>
        </div>
      )}
    </>
  );
}
