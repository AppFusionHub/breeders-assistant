import { Egg, EggOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, birdLabel } from '../db';
import { useBirds } from '../hooks';
import { Empty, IconBadge } from '../components';
import { fmt, today } from '../lib/dates';
import { incubationDay, rate } from '../lib/incubation';

export default function Batches() {
  const batches = useLiveQuery(() => db.batches.orderBy('setDate').reverse().toArray(), []);
  const { map } = useBirds();
  const t = today();

  const closed = (batches ?? []).filter((b) => b.closed);
  const totals = closed.reduce((a, b) => ({ set: a.set + b.eggsSet, hatched: a.hatched + (b.hatched ?? 0) }), { set: 0, hatched: 0 });

  return (
    <div className="stack">
      <div className="toolbar">
        <h1 className="grow">Incubation</h1>
        <Link to="/hatch/new" className="btn primary">+ Set eggs</Link>
      </div>
      {closed.length > 0 && (
        <p className="small muted">Overall hatch rate (closed batches): <b>{rate(totals.hatched, totals.set)}</b> of {totals.set} eggs set</p>
      )}
      {batches && !batches.length && <Empty>No batches yet. Record each set of eggs to track fertility and hatch rate per pair.</Empty>}
      <ul className="list">
        {batches?.map((b) => (
          <li key={b.id}>
            <Link to={`/hatch/${b.id}`} className="bird-row">
              <IconBadge icon={b.closed ? EggOff : Egg} tone={b.closed ? 'gray' : 'green'} size={44} />
              <div className="grow">
                <b>{b.label}</b>
                <div className="muted small">{birdLabel(map.get(b.sireId ?? -1))} × {birdLabel(map.get(b.damId ?? -1))}</div>
                <div className="muted small">Set {fmt(b.setDate)} · {b.eggsSet} eggs</div>
              </div>
              <div className="right small">
                {b.closed ? <>Hatched<br /><b>{rate(b.hatched, b.eggsSet)}</b></> : <>Day<br /><b>{incubationDay(b.setDate, t)}</b></>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
