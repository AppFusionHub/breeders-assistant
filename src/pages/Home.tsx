import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { BellPlus, Bird, ChevronRight, Egg, Plus, Syringe, Wallet } from 'lucide-react';
import { db } from '../db';
import { Card, IconBadge } from '../components';
import { useBirds, useDueHealth } from '../hooks';
import { fmtShort, today } from '../lib/dates';
import { incubationDay, nextMilestone } from '../lib/incubation';
import { peso, periodRange, summarize } from '../lib/money';
import { useTodayList } from '../schedule';
import { OccurrenceRow } from './Reminders';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Magandang umaga' : h < 18 ? 'Magandang hapon' : 'Magandang gabi';
}

function Ring({ done, total }: { done: number; total: number }) {
  const r = 18, c = 2 * Math.PI * r, pct = total ? done / total : 0;
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" className="ring" role="img" aria-label={`${done} of ${total} done`}>
      <circle cx="24" cy="24" r={r} className="ring-track" />
      <circle cx="24" cy="24" r={r} className="ring-fill" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 24 24)" />
      <text x="24" y="28" textAnchor="middle" className="ring-text">{done}/{total}</text>
    </svg>
  );
}

export default function Home() {
  const stats = useLiveQuery(async () => {
    const active = await db.birds.where('status').equals('active').toArray();
    return { cocks: active.filter((b) => b.sex === 'M').length, hens: active.filter((b) => b.sex === 'F').length, other: active.filter((b) => b.sex === 'U').length };
  }, []);
  const open = useLiveQuery(() => db.batches.filter((b) => !b.closed).toArray(), []);
  const due = useDueHealth(7);
  const todayList = useTodayList();
  const { map } = useBirds();
  const t = today();
  const [mFrom, mTo] = periodRange({ kind: 'month', year: Number(t.slice(0, 4)), month: Number(t.slice(5, 7)) });
  const month = useLiveQuery(async () => summarize(await db.transactions.where('date').between(mFrom, mTo, true, true).toArray()), [mFrom, mTo]);
  const todays = todayList?.filter((o) => o.date === t) ?? [];
  const doneToday = todays.filter((o) => o.done).length;
  const dateStr = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="stack">
      <div className="hello">
        <p className="small muted">{dateStr}</p>
        <h1>{greeting()}!</h1>
      </div>

      <div className="quick">
        <Link to="/birds/new" className="quick-btn"><IconBadge icon={Bird} tone="red" size={44} /><span>Add bird</span></Link>
        <Link to="/hatch/new" className="quick-btn"><IconBadge icon={Egg} tone="green" size={44} /><span>Set eggs</span></Link>
        <Link to="/costs/new" className="quick-btn"><IconBadge icon={Wallet} tone="gold" size={44} /><span>Log cost</span></Link>
        <Link to="/reminders/new" className="quick-btn"><IconBadge icon={BellPlus} tone="plum" size={44} /><span>Reminder</span></Link>
      </div>

      <Card className="today">
        <div className="card-head">
          <div><h2>Today</h2><span className="small muted">{todays.length ? `${todays.length - doneToday} left` : 'No tasks scheduled'}</span></div>
          {todays.length > 0 && <Ring done={doneToday} total={todays.length} />}
        </div>
        {todayList && !todayList.length && (
          <p className="small muted">Nothing to do today. <Link to="/programs">Start a program</Link> or <Link to="/reminders/new">add a reminder</Link>.</p>
        )}
        {todayList?.map((o) => <OccurrenceRow key={`${o.reminder.id}-${o.date}`} o={o} map={map} />)}
      </Card>

      <div className="stat-row">
        <Link to="/birds?sex=M" className="stat"><b>{stats?.cocks ?? '–'}</b><span>Cocks & stags</span></Link>
        <Link to="/birds?sex=F" className="stat"><b>{stats?.hens ?? '–'}</b><span>Hens & pullets</span></Link>
        <Link to="/birds?sex=U" className="stat"><b>{stats?.other ?? '–'}</b><span>Unsexed</span></Link>
      </div>

      {!!open?.length && (
        <Card>
          <div className="card-head"><h2>Incubating</h2><Link to="/hatch" className="small">All</Link></div>
          {open.map((b) => {
            const m = nextMilestone(b.setDate, t);
            const day = incubationDay(b.setDate, t);
            return (
              <Link key={b.id} to={`/hatch/${b.id}`} className="row-link">
                <IconBadge icon={Egg} tone="green" size={36} />
                <div className="grow">
                  <b>{b.label}</b>
                  <div className="mini-progress"><div style={{ width: `${Math.min(100, (day / 21) * 100)}%` }} /></div>
                  <span className="small muted">Day {day} of 21 · {m ? `${m.title} ${m.date === t ? 'today' : fmtShort(m.date)}` : b.hatched != null ? `Hatched ${b.hatched}/${b.eggsSet}` : 'Record hatch results'}</span>
                </div>
                <ChevronRight size={18} className="muted" />
              </Link>
            );
          })}
        </Card>
      )}

      {!!due?.length && (
        <Link to="/health" className="card alert-card">
          <IconBadge icon={Syringe} tone="blue" size={40} />
          <div className="grow">
            <b>{due.length} vaccination{due.length > 1 ? 's' : ''} due this week</b>
            <span className="small muted">{due.some((d) => d.overdue) ? 'Some are overdue · ' : ''}{[...new Set(due.map((d) => d.name))].slice(0, 2).join(', ')}</span>
          </div>
          <ChevronRight size={18} className="muted" />
        </Link>
      )}

      <Link to="/costs" className="card alert-card">
        <IconBadge icon={Wallet} tone="gold" size={40} />
        <div className="grow"><b>{peso(month?.expense ?? 0, true)} spent this month</b><span className="small muted">Feed, vitamins and other costs</span></div>
        <ChevronRight size={18} className="muted" />
      </Link>

      {stats && stats.cocks + stats.hens + stats.other === 0 && (
        <Card className="welcome">
          <h2>Welcome! Start here</h2>
          <ol className="tight small">
            <li><Link to="/birds/new">Add your broodcocks and hens</Link>, with their parents if you know them.</li>
            <li><Link to="/pair">Plan a mating</Link> and check the inbreeding level.</li>
            <li><Link to="/hatch/new">Set eggs</Link> to track the 21 days and register chicks.</li>
            <li><Link to="/settings">Back up</Link> your data from time to time.</li>
          </ol>
          <Link to="/birds/new" className="btn primary"><Plus size={18} /> Add first bird</Link>
        </Card>
      )}
    </div>
  );
}
