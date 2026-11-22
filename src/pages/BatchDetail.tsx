import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, birdLabel, type Bird } from '../db';
import { useBirds } from '../hooks';
import { Card, Field } from '../components';
import { addDays, fmt, today } from '../lib/dates';
import { incubationDay, milestoneDates, rate } from '../lib/incubation';

export default function BatchDetail() {
  const id = Number(useParams().id);
  const nav = useNavigate();
  const batch = useLiveQuery(() => db.batches.get(id), [id]);
  const chicks = useLiveQuery(() => db.birds.where('batchId').equals(id).toArray(), [id]);
  const { map } = useBirds();
  const [prefix, setPrefix] = useState('');
  const t = today();

  if (batch === undefined) return null;
  if (!batch) return <p className="muted">Batch not found.</p>;
  const day = incubationDay(batch.setDate, t);
  const sire = map.get(batch.sireId ?? -1), dam = map.get(batch.damId ?? -1);

  const num = (v: string) => (v === '' ? undefined : Math.max(0, Number(v)));

  async function registerChicks() {
    const n = (batch!.hatched ?? 0) - (chicks?.length ?? 0);
    if (n <= 0) return;
    const pre = prefix.trim() || `${batch!.setDate.slice(2, 4)}-${sire?.band ?? 'X'}-`;
    const hatchDate = addDays(batch!.setDate, 21);
    const existing = new Set((await db.birds.toArray()).map((b) => b.band));
    const recs: Omit<Bird, 'id'>[] = [];
    let i = 1;
    while (recs.length < n) {
      const band = `${pre}${String(i++).padStart(2, '0')}`;
      if (existing.has(band)) continue;
      recs.push({
        band, sex: 'U', status: 'active', hatchDate, sireId: batch!.sireId, damId: batch!.damId,
        bloodline: sire?.bloodline && dam?.bloodline
          ? (sire.bloodline === dam.bloodline ? sire.bloodline : `${sire.bloodline} × ${dam.bloodline}`)
          : sire?.bloodline ?? dam?.bloodline,
        batchId: id, createdAt: Date.now(),
      });
    }
    await db.birds.bulkAdd(recs as Bird[]);
  }

  async function remove() {
    if (!confirm('Delete this batch? Registered chicks are kept.')) return;
    await db.birds.where('batchId').equals(id).modify({ batchId: undefined });
    await db.batches.delete(id);
    nav('/hatch', { replace: true });
  }

  const toRegister = (batch.hatched ?? 0) - (chicks?.length ?? 0);

  return (
    <div className="stack">
      <div className="toolbar">
        <div className="grow">
          <h1>{batch.label}</h1>
          <div className="muted small">{birdLabel(sire)} × {birdLabel(dam)} · {batch.method === 'hen' ? 'Hen' : 'Incubator'}</div>
        </div>
        <Link to={`/hatch/${id}/edit`} className="btn">Edit</Link>
      </div>

      <Card>
        <div className="progress"><div style={{ width: `${Math.min(100, Math.max(0, (day / 21) * 100))}%` }} /></div>
        <p className="small">Day <b>{day}</b> of 21 · set {fmt(batch.setDate)} · {batch.eggsSet} eggs</p>
        <ol className="timeline">
          {milestoneDates(batch.setDate).map((m) => (
            <li key={m.day} className={m.day < day ? 'past' : m.day === day ? 'now' : ''}>
              <div className="tl-head"><b>Day {m.day}: {m.title}</b><span className="small muted">{fmt(m.date)}</span></div>
              <div className="small">{m.detail}</div>
            </li>
          ))}
        </ol>
      </Card>

      <Card>
        <h2>Results</h2>
        <div className="grid2">
          <Field label="Fertile (after candling)">
            <input type="number" inputMode="numeric" min={0} max={batch.eggsSet} value={batch.fertile ?? ''}
              onChange={(e) => db.batches.update(id, { fertile: num(e.target.value) })} />
          </Field>
          <Field label="Hatched">
            <input type="number" inputMode="numeric" min={0} max={batch.eggsSet} value={batch.hatched ?? ''}
              onChange={(e) => db.batches.update(id, { hatched: num(e.target.value) })} />
          </Field>
        </div>
        <dl className="facts">
          <dt>Fertility</dt><dd>{rate(batch.fertile, batch.eggsSet)}</dd>
          <dt>Hatch of set</dt><dd>{rate(batch.hatched, batch.eggsSet)}</dd>
          <dt>Hatch of fertile</dt><dd>{rate(batch.hatched, batch.fertile)}</dd>
        </dl>
        <label className="check">
          <input type="checkbox" checked={!!batch.closed} onChange={(e) => db.batches.update(id, { closed: e.target.checked })} />
          Batch finished
        </label>
      </Card>

      {(batch.hatched ?? 0) > 0 && (
        <Card>
          <h2>Chicks ({chicks?.length ?? 0} registered)</h2>
          {toRegister > 0 && (
            <>
              <Field label="Band prefix" hint={`Leave blank for "${batch.setDate.slice(2, 4)}-${sire?.band ?? 'X'}-01", -02…`}>
                <input value={prefix} onChange={(e) => setPrefix(e.target.value)} />
              </Field>
              <button className="btn primary" onClick={registerChicks}>Register {toRegister} chick{toRegister > 1 ? 's' : ''}</button>
              <p className="hint">Chicks get this pair as parents, hatch date = day 21, and enter the vaccination schedule.</p>
            </>
          )}
          {!!chicks?.length && (
            <Link to={`/health?batch=${id}`} className="btn" style={{ width: '100%', margin: '6px 0' }}>Record vitamins / medicine for all {chicks.length} chicks</Link>
          )}
          {chicks?.map((c) => (
            <Link key={c.id} to={`/birds/${c.id}`} className="row-link"><span>{c.band}</span><span className="small muted">{c.sex === 'U' ? 'unsexed' : c.sex}</span></Link>
          ))}
        </Card>
      )}

      <button className="btn danger ghost" onClick={remove}>Delete batch</button>
    </div>
  );
}
