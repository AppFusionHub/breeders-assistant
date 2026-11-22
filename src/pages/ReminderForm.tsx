import { AlarmClock } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { db, type Reminder } from '../db';
import { useBirds } from '../hooks';
import { BirdMultiPicker, Card, Field } from '../components';
import { today } from '../lib/dates';
import { googleCalendarUrl, repeatLabel } from '../lib/reminders';
import { downloadICS } from '../schedule';

type Draft = Omit<Reminder, 'id' | 'createdAt' | 'active'>;

export default function ReminderForm() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { birds } = useBirds();
  const [saved, setSaved] = useState<Reminder | null>(null);
  const [d, setD] = useState<Draft>({
    title: '', date: today(), time: '07:00', repeat: { kind: 'once' }, birdIds: sp.get('bird') ? [Number(sp.get('bird'))] : [],
  });
  const [err, setErr] = useState('');
  useEffect(() => {
    if (id) db.reminders.get(Number(id)).then((r) => { if (r) { setD(r); setSaved(r); } });
  }, [id]);
  const up = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const every = d.repeat.kind === 'every' ? d.repeat.days : 0;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!d.title.trim()) return setErr('Enter what to do.');
    if (d.endDate && d.endDate < d.date) return setErr('End date is before the start date.');
    const rec = { ...d, title: d.title.trim(), notes: d.notes?.trim() || undefined, group: d.group?.trim() || undefined,
      endDate: d.repeat.kind === 'every' ? d.endDate || undefined : undefined };
    if (id) {
      await db.reminders.update(Number(id), rec);
      setSaved({ ...(saved as Reminder), ...rec });
    } else {
      const nid = await db.reminders.add({ ...rec, active: true, createdAt: Date.now() } as Reminder);
      nav(`/reminders/${nid}`, { replace: true });
    }
  }

  async function remove() {
    if (!confirm('Delete this reminder?')) return;
    await db.transaction('rw', db.reminders, db.reminderDone, async () => {
      await db.reminderDone.where('reminderId').equals(Number(id)).delete();
      await db.reminders.delete(Number(id));
    });
    nav(-1);
  }

  return (
    <div className="stack">
      <h1>{id ? 'Reminder' : 'New reminder'}</h1>

      {saved && (
        <Card className="cal-card">
          <h2 className="h-icon"><AlarmClock size={20} /> Alarm on your phone</h2>
          <p className="small muted">Add this to your phone's calendar so it rings even when the app is closed. {repeatLabel(saved)} at {saved.time}.</p>
          <div className="actions">
            <a className="btn primary" href={googleCalendarUrl(saved)} target="_blank" rel="noreferrer">Google Calendar</a>
            <button className="btn" onClick={() => downloadICS([saved], `reminder-${saved.id}.ics`)}>Calendar file (.ics)</button>
          </div>
          <p className="hint">Android: use Google Calendar. iPhone or Samsung Calendar: use the .ics file. If you edit the reminder later, add it to your calendar again.</p>
        </Card>
      )}

      <form className="stack" onSubmit={save}>
        <Card>
          <Field label="What to do">
            <input value={d.title} onChange={(e) => up('title', e.target.value)} autoFocus={!id} placeholder="e.g. Vitamins in water, Clean pens" />
          </Field>
          <div className="grid2">
            <Field label="Start date"><input type="date" value={d.date} onChange={(e) => up('date', e.target.value)} required /></Field>
            <Field label="Time"><input type="time" value={d.time} onChange={(e) => up('time', e.target.value)} required /></Field>
          </div>
          <Field label="Repeat">
            <select value={every} onChange={(e) => { const n = Number(e.target.value); up('repeat', n ? { kind: 'every', days: n } : { kind: 'once' }); }}>
              <option value={0}>Once</option>
              <option value={1}>Every day</option>
              <option value={2}>Every 2 days</option>
              <option value={3}>Every 3 days</option>
              <option value={7}>Every week</option>
              <option value={14}>Every 2 weeks</option>
              <option value={30}>Every 30 days</option>
            </select>
          </Field>
          {every > 0 && (
            <Field label="Until (optional)"><input type="date" value={d.endDate ?? ''} onChange={(e) => up('endDate', e.target.value || undefined)} /></Field>
          )}
          <Field label="Birds (optional)" group>
            <BirdMultiPicker birds={birds ?? []} value={d.birdIds} onChange={(v) => up('birdIds', v)} />
          </Field>
          <Field label="Group / pen (optional)">
            <input value={d.group ?? ''} onChange={(e) => up('group', e.target.value)} placeholder="e.g. Breeding pen 1, Stags" />
          </Field>
          <Field label="Notes"><textarea rows={3} value={d.notes ?? ''} onChange={(e) => up('notes', e.target.value)} /></Field>
        </Card>
        {err && <p className="error">{err}</p>}
        <div className="actions">
          {id && <button type="button" className="btn danger ghost" onClick={remove}>Delete</button>}
          <button type="submit" className="btn primary">{id ? 'Save changes' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}
