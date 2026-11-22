import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, birdLabel, DEFAULT_PROTOCOL, type HealthKind, type ProtocolItem } from '../db';
import { useBirds, useDueHealth } from '../hooks';
import { BirdPicker, Card, Empty, Field } from '../components';
import { fmt, today } from '../lib/dates';

type Tab = 'due' | 'log' | 'schedule';

export default function Health() {
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get('tab') ?? (sp.get('bird') ? 'log' : 'due')) as Tab;
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
      {tab === 'log' && <Log initialBird={sp.get('bird') ? Number(sp.get('bird')) : undefined} />}
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

function Log({ initialBird }: { initialBird?: number }) {
  const { birds, map } = useBirds();
  const events = useLiveQuery(() => db.health.orderBy('date').reverse().limit(100).toArray(), []);
  const [birdId, setBirdId] = useState<number | undefined>(initialBird);
  const [date, setDate] = useState(today());
  const [kind, setKind] = useState<HealthKind>('treatment');
  const [product, setProduct] = useState('');
  const [notes, setNotes] = useState('');

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!birdId || !product.trim()) return;
    await db.health.add({ birdId, date, kind, product: product.trim(), notes: notes.trim() || undefined } as never);
    setProduct(''); setNotes('');
  }

  return (
    <>
      <form onSubmit={add}>
        <Card>
          <Field label="Bird"><BirdPicker birds={(birds ?? []).filter((b) => b.status === 'active')} value={birdId} onChange={setBirdId} /></Field>
          <div className="grid2">
            <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Type">
              <select value={kind} onChange={(e) => setKind(e.target.value as HealthKind)}>
                <option value="vaccine">Vaccine</option>
                <option value="deworm">Deworming</option>
                <option value="treatment">Treatment</option>
                <option value="vitamins">Vitamins</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </div>
          <Field label="Product / what was done"><input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="e.g. dewormer brand, antibiotic, dose" /></Field>
          <Field label="Notes"><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Symptoms, dose, vet advice" /></Field>
          <button className="btn primary" disabled={!birdId || !product.trim()}>Add record</button>
        </Card>
      </form>
      <Card>
        <h2>Recent records</h2>
        {!events?.length && <p className="muted small">No records yet.</p>}
        {events?.map((h) => (
          <div key={h.id} className="row-link">
            <div>
              <b>{h.product}</b> <span className="muted small">{h.kind}</span>
              <div className="small"><Link to={`/birds/${h.birdId}`}>{birdLabel(map.get(h.birdId))}</Link>{h.notes && ` · ${h.notes}`}</div>
            </div>
            <div className="right">
              <div className="small">{fmt(h.date)}</div>
              <button className="link-btn small" onClick={() => confirm('Delete record?') && db.health.delete(h.id)}>Delete</button>
            </div>
          </div>
        ))}
      </Card>
    </>
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
