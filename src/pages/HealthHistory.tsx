import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Syringe } from 'lucide-react';
import { db, type Bird, type HealthKind } from '../db';
import { Card } from '../components';
import { ageLabel, fmtShort, today } from '../lib/dates';
import { KINDS, kindLabel, pendingForBird } from '../lib/health';

/** Lifetime health record for one bird: upcoming vaccines + every vaccine, dewormer, vitamin and treatment given. */
export function HealthHistory({ bird }: { bird: Bird }) {
  const [filter, setFilter] = useState<HealthKind | 'all'>('all');
  const data = useLiveQuery(async () => {
    const [events, protocol] = await Promise.all([db.health.where('birdId').equals(bird.id).toArray(), db.protocol.orderBy('dayFrom').toArray()]);
    return { events: events.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id), protocol };
  }, [bird.id]);
  if (!data) return null;
  const t = today();
  const pending = bird.status === 'active' ? pendingForBird(bird.hatchDate, data.protocol, data.events, t) : [];
  const counts = Object.fromEntries(KINDS.map((k) => [k.id, data.events.filter((e) => e.kind === k.id).length]));
  const shown = data.events.filter((e) => filter === 'all' || e.kind === filter);

  async function given(protocolId: number, name: string, route?: string) {
    await db.health.add({ birdId: bird.id, protocolId, date: t, kind: 'vaccine', product: name, route } as never);
  }

  return (
    <Card>
      <div className="card-head">
        <h2 className="h-icon"><Syringe size={18} /> Health record</h2>
        <Link className="btn small" to={`/health?bird=${bird.id}`}><Plus size={16} /> Add</Link>
      </div>

      {pending.length > 0 && (
        <div className="due-box">
          <span className="small muted">Vaccines still to give</span>
          {pending.slice(0, 3).map((p) => (
            <div key={p.protocolId} className="due-row">
              <div className="grow">
                <b className="small">{p.name}</b>
                <div className={`small ${p.overdue ? 'danger' : 'muted'}`}>
                  {p.overdue ? 'Overdue · ' : ''}{fmtShort(p.due)}{p.dueEnd !== p.due && `–${fmtShort(p.dueEnd)}`}
                  {bird.hatchDate && ` (age ${ageLabel(bird.hatchDate, p.due)})`}
                </div>
              </div>
              <button className="btn small" onClick={() => given(p.protocolId, p.name, p.route)}>✓ Given</button>
            </div>
          ))}
          {pending.length > 3 && <span className="small muted">+{pending.length - 3} more later</span>}
        </div>
      )}
      {!bird.hatchDate && bird.status === 'active' && <p className="hint">Add a hatch date to see this bird's vaccination schedule.</p>}

      {data.events.length > 0 && (
        <div className="chips" style={{ margin: '10px 0 2px' }}>
          <button className={`chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>All {data.events.length}</button>
          {KINDS.filter((k) => counts[k.id]).map((k) => (
            <button key={k.id} className={`chip ${filter === k.id ? 'on' : ''}`} onClick={() => setFilter(k.id)}>{k.plural} {counts[k.id]}</button>
          ))}
        </div>
      )}

      {!data.events.length && <p className="small muted">Nothing recorded yet. Everything given to this bird, from chick to adult, will be listed here.</p>}
      <ol className="hist">
        {shown.map((h) => (
          <li key={h.id}>
            <Link to={`/health/record/${h.id}`} className="hist-row">
              <span className={`hist-dot kind-${h.kind}`} />
              <div className="grow">
                <div><b>{h.product}</b> <span className={`kind-tag kind-${h.kind}`}>{kindLabel(h.kind)}</span></div>
                <div className="small muted">
                  {[h.dose, h.route, h.notes && h.notes !== 'Recorded from reminder' ? h.notes : null].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div className="right">
                <div className="small">{fmtShort(h.date)}</div>
                {bird.hatchDate && <div className="small muted">{ageLabel(bird.hatchDate, h.date)}</div>}
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}
