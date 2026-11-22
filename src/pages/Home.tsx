import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card } from '../components';
import { useDueHealth } from '../hooks';
import { fmt, today } from '../lib/dates';
import { incubationDay, nextMilestone } from '../lib/incubation';
import { peso, periodRange, summarize } from '../lib/money';

export default function Home() {
  const stats = useLiveQuery(async () => {
    const active = await db.birds.where('status').equals('active').toArray();
    return {
      cocks: active.filter((b) => b.sex === 'M').length,
      hens: active.filter((b) => b.sex === 'F').length,
      other: active.filter((b) => b.sex === 'U').length,
    };
  }, []);
  const open = useLiveQuery(() => db.batches.filter((b) => !b.closed).toArray(), []);
  const due = useDueHealth(7);
  const t = today();
  const [mFrom, mTo] = periodRange({ kind: 'month', year: Number(t.slice(0, 4)), month: Number(t.slice(5, 7)) });
  const month = useLiveQuery(async () => summarize(await db.transactions.where('date').between(mFrom, mTo, true, true).toArray()), [mFrom, mTo]);

  return (
    <div className="stack">
      <div className="stat-row">
        <Link to="/birds?sex=M" className="stat"><b>{stats?.cocks ?? '–'}</b><span>Cocks/Stags</span></Link>
        <Link to="/birds?sex=F" className="stat"><b>{stats?.hens ?? '–'}</b><span>Hens/Pullets</span></Link>
        <Link to="/birds?sex=U" className="stat"><b>{stats?.other ?? '–'}</b><span>Chicks</span></Link>
      </div>

      <div className="actions">
        <Link to="/birds/new" className="btn primary">+ Add bird</Link>
        <Link to="/pair" className="btn">Plan a mating</Link>
        <Link to="/hatch/new" className="btn">Set eggs</Link>
      </div>

      <Card>
        <h2>Incubating now</h2>
        {!open?.length && <p className="muted">No active batches. <Link to="/hatch/new">Set eggs</Link></p>}
        {open?.map((b) => {
          const m = nextMilestone(b.setDate, t);
          return (
            <Link key={b.id} to={`/hatch/${b.id}`} className="row-link">
              <div>
                <b>{b.label}</b>
                <div className="muted small">Day {incubationDay(b.setDate, t)} · {b.eggsSet} eggs</div>
              </div>
              <div className="right small">
                {m ? <>{m.title}<br /><span className="muted">{m.date === t ? 'Today' : fmt(m.date)}</span></>
                  : b.hatched != null ? <>Hatched {b.hatched}/{b.eggsSet}<br /><span className="muted">Tap to finish batch</span></>
                  : <span className="danger">Past hatch day:<br />record results</span>}
              </div>
            </Link>
          );
        })}
      </Card>

      <Card>
        <h2>Health due this week</h2>
        {!due?.length && <p className="muted">Nothing due. Schedules come from each bird's hatch date.</p>}
        {due?.slice(0, 8).map((d) => (
          <Link key={`${d.bird.id}-${d.protocolId}`} to="/health" className="row-link">
            <div><b>{d.bird.band}</b> <span className="small">{d.name}</span></div>
            <div className={`right small ${d.overdue ? 'danger' : ''}`}>{d.overdue ? 'Overdue' : fmt(d.due)}</div>
          </Link>
        ))}
        {(due?.length ?? 0) > 8 && <Link to="/health" className="small">See all {due!.length} →</Link>}
      </Card>

      <div className="grid2">
        <Link to="/costs" className="card guide-card">
          <span className="small muted">Spent this month</span>
          <b className="money">{peso(month?.expense ?? 0, true)}</b>
        </Link>
        <Link to="/nicks" className="card guide-card">
          <span className="small muted">Breeding</span>
          <b>★ Nick finder</b>
        </Link>
      </div>
      <Link to="/guides" className="card guide-card">
        <b>📖 Guides</b>
        <span className="small muted">Incubation, brooding, vaccination, biosecurity, breeding systems</span>
      </Link>

      <p className="muted small center">All data stays on this phone. Back it up often in Settings.</p>
    </div>
  );
}
