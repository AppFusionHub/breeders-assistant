import { ClipboardList } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Bird, type Reminder } from '../db';
import { useBirds } from '../hooks';
import { Card, Empty, Tile } from '../components';
import { addDays, fmt, today } from '../lib/dates';
import { repeatLabel } from '../lib/reminders';
import { toggleDone, useOccurrences, useTodayList, type Occurrence } from '../schedule';

export function whoLabel(r: Reminder, map: Map<number, Bird>): string {
  const birds = r.birdIds.map((id) => map.get(id)?.band).filter(Boolean) as string[];
  const parts = [r.group, birds.length > 3 ? `${birds.slice(0, 3).join(', ')} +${birds.length - 3}` : birds.join(', ')].filter(Boolean);
  return parts.join(' · ');
}

export function OccurrenceRow({ o, map, showDate }: { o: Occurrence; map: Map<number, Bird>; showDate?: boolean }) {
  const who = whoLabel(o.reminder, map);
  // Optimistic: reflect the tap immediately, then persist.
  const [done, setDone] = useState(o.done);
  useEffect(() => setDone(o.done), [o.done]);
  const late = !done && o.date < today();
  return (
    <div className={`occ ${done ? 'done' : ''}`}>
      <input type="checkbox" checked={done} aria-label={`Done: ${o.reminder.title}`}
        onChange={(e) => { setDone(e.target.checked); toggleDone(o.reminder.id, o.date, e.target.checked); }} />
      <Link to={`/reminders/${o.reminder.id}`} className="grow occ-body">
        <b>{o.reminder.title}</b>
        <span className="small muted">
          {showDate || late ? `${fmt(o.date)} · ` : ''}{o.reminder.time}{who && ` · ${who}`}
          {late && <span className="danger"> · missed</span>}
        </span>
      </Link>
    </div>
  );
}

export default function Reminders() {
  const { map } = useBirds();
  const t = today();
  const todayList = useTodayList();
  const upcoming = useOccurrences(addDays(t, 1), addDays(t, 7));
  const runs = useLiveQuery(() => db.runs.filter((r) => !r.stopped).toArray(), []);
  const standalone = useLiveQuery(() => db.reminders.filter((r) => r.active && r.runId == null).toArray(), []);

  return (
    <div className="stack">
      <div className="toolbar">
        <h1 className="grow">Reminders</h1>
        <Link to="/reminders/new" className="btn primary">+ Add</Link>
      </div>
      <Tile to="/programs" icon={ClipboardList} tone="plum" title="Programs & routines" meta="Ready-made breeding-season programs or your own routines" />

      <Card>
        <h2>Today</h2>
        {todayList && !todayList.length && <p className="muted small">Nothing for today.</p>}
        {todayList?.map((o) => <OccurrenceRow key={`${o.reminder.id}-${o.date}`} o={o} map={map} />)}
      </Card>

      <Card>
        <h2>Next 7 days</h2>
        {upcoming && !upcoming.length && <p className="muted small">Nothing scheduled.</p>}
        {upcoming?.map((o) => <OccurrenceRow key={`${o.reminder.id}-${o.date}`} o={o} map={map} showDate />)}
      </Card>

      {!!runs?.length && (
        <Card>
          <h2>Running programs</h2>
          {runs.map((r) => (
            <Link key={r.id} to={`/runs/${r.id}`} className="row-link">
              <div><b>{r.name}</b><div className="small muted">Started {fmt(r.startDate)}{r.group && ` · ${r.group}`}{r.birdIds.length ? ` · ${r.birdIds.length} bird(s)` : ''}</div></div>
              <span className="small">→</span>
            </Link>
          ))}
        </Card>
      )}

      <Card>
        <h2>My reminders</h2>
        {standalone && !standalone.length && <Empty>No single reminders yet. Tap <b>+ Add</b> for things like "Vitamins every Monday".</Empty>}
        {standalone?.map((r) => (
          <Link key={r.id} to={`/reminders/${r.id}`} className="row-link">
            <div><b>{r.title}</b><div className="small muted">{repeatLabel(r)} · {r.time}{whoLabel(r, map) && ` · ${whoLabel(r, map)}`}</div></div>
            <span className="small">→</span>
          </Link>
        ))}
      </Card>

      <p className="small muted">For alarms that ring even when the app is closed, open a reminder or program and tap <b>Add to calendar</b>.</p>
    </div>
  );
}
