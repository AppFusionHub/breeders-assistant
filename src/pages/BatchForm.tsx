import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { db, type Batch } from '../db';
import { useBirds } from '../hooks';
import { BirdPicker, Card, Field } from '../components';
import { fmt, today } from '../lib/dates';

type Draft = Omit<Batch, 'id' | 'createdAt'>;

export default function BatchForm() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { birds, map } = useBirds();
  const [d, setD] = useState<Draft>({
    label: '', method: 'incubator', setDate: today(), eggsSet: 10,
    sireId: sp.get('sire') ? Number(sp.get('sire')) : undefined,
    damId: sp.get('dam') ? Number(sp.get('dam')) : undefined,
  });
  useEffect(() => { if (id) db.batches.get(Number(id)).then((b) => b && setD(b)); }, [id]);
  const up = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const active = (birds ?? []).filter((b) => b.status === 'active');

  async function save(e: FormEvent) {
    e.preventDefault();
    const label = d.label.trim() ||
      `${map.get(d.sireId ?? -1)?.band ?? '?'} × ${map.get(d.damId ?? -1)?.band ?? '?'} · ${fmt(d.setDate)}`;
    const rec = { ...d, label, eggsSet: Math.max(1, Number(d.eggsSet) || 1) };
    if (id) {
      await db.batches.update(Number(id), rec);
      nav(`/hatch/${id}`, { replace: true });
    } else {
      const nid = await db.batches.add({ ...rec, createdAt: Date.now() } as Batch);
      nav(`/hatch/${nid}`, { replace: true });
    }
  }

  return (
    <form className="stack" onSubmit={save}>
      <h1>{id ? 'Edit batch' : 'Set eggs'}</h1>
      <Card>
        <Field label="Sire"><BirdPicker birds={active} sex="M" value={d.sireId} onChange={(v) => up('sireId', v)} placeholder="Unknown / mixed" /></Field>
        <Field label="Dam"><BirdPicker birds={active} sex="F" value={d.damId} onChange={(v) => up('damId', v)} placeholder="Unknown / mixed" /></Field>
        <Field label="Date set"><input type="date" value={d.setDate} onChange={(e) => up('setDate', e.target.value)} required /></Field>
        <Field label="Number of eggs"><input type="number" inputMode="numeric" min={1} value={d.eggsSet} onChange={(e) => up('eggsSet', Number(e.target.value))} /></Field>
        <Field label="Method" group>
          <div className="seg">
            <button type="button" className={d.method === 'incubator' ? 'on' : ''} onClick={() => up('method', 'incubator')}>Incubator</button>
            <button type="button" className={d.method === 'hen' ? 'on' : ''} onClick={() => up('method', 'hen')}>Hen (natural)</button>
          </div>
        </Field>
        <Field label="Label (optional)" hint="Leave blank to auto-name from the pair and date">
          <input value={d.label} onChange={(e) => up('label', e.target.value)} />
        </Field>
        <Field label="Notes"><textarea rows={2} value={d.notes ?? ''} onChange={(e) => up('notes', e.target.value)} /></Field>
      </Card>
      <div className="actions sticky">
        <button type="button" className="btn ghost" onClick={() => nav(-1)}>Cancel</button>
        <button type="submit" className="btn primary">Save</button>
      </div>
    </form>
  );
}
