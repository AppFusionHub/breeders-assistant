import { Camera } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { db, type Bird, type BirdStatus, type Sex } from '../db';
import { useBirds } from '../hooks';
import { BirdPicker, Card, Field, Stars } from '../components';
import { resizePhoto } from '../lib/photo';

type Draft = Omit<Bird, 'id' | 'createdAt'>;

const blank: Draft = { band: '', sex: 'M', status: 'active' };

export default function BirdForm() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { birds } = useBirds();
  const [d, setD] = useState<Draft>({
    ...blank,
    sireId: sp.get('sire') ? Number(sp.get('sire')) : undefined,
    damId: sp.get('dam') ? Number(sp.get('dam')) : undefined,
  });
  const [err, setErr] = useState('');

  useEffect(() => {
    if (id) db.birds.get(Number(id)).then((b) => b && setD(b));
  }, [id]);

  const up = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const bloodlines = [...new Set((birds ?? []).map((b) => b.bloodline).filter(Boolean))] as string[];

  async function onPhoto(f?: File) {
    if (f) up('photo', await resizePhoto(f));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const band = d.band.trim();
    if (!band) return setErr('Band / ID is required.');
    const dup = await db.birds.where('band').equals(band).first();
    if (dup && dup.id !== Number(id)) return setErr(`Band ${band} is already used.`);
    if (id && (d.sireId === Number(id) || d.damId === Number(id))) return setErr('A bird cannot be its own parent.');
    const rec = { ...d, band, name: d.name?.trim() || undefined, bloodline: d.bloodline?.trim() || undefined };
    if (id) {
      await db.birds.update(Number(id), rec);
      nav(`/birds/${id}`, { replace: true });
    } else {
      const newId = await db.birds.add({ ...rec, createdAt: Date.now() } as Bird);
      nav(`/birds/${newId}`, { replace: true });
    }
  }

  const others = (birds ?? []).filter((b) => b.id !== Number(id));

  return (
    <form className="stack" onSubmit={save}>
      <h1>{id ? 'Edit bird' : 'Add bird'}</h1>
      <Card>
        <div className="photo-field">
          {d.photo ? <img src={d.photo} alt="" className="photo-preview" /> : <div className="photo-preview placeholder">No photo</div>}
          <div className="stack-sm">
            <label className="btn">
              <Camera size={18} /> {d.photo ? 'Change photo' : 'Add photo'}
              <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
            </label>
            {d.photo && <button type="button" className="btn ghost" onClick={() => up('photo', undefined)}>Remove</button>}
          </div>
        </div>
        <Field label="Band / ID *" hint="Wing or leg band number, e.g. 26-KL-014">
          <input value={d.band} onChange={(e) => up('band', e.target.value)} autoFocus={!id} />
        </Field>
        <Field label="Name (optional)">
          <input value={d.name ?? ''} onChange={(e) => up('name', e.target.value)} />
        </Field>
        <Field label="Sex" group>
          <div className="seg">
            {(['M', 'F', 'U'] as Sex[]).map((s) => (
              <button type="button" key={s} className={d.sex === s ? 'on' : ''} onClick={() => up('sex', s)}>
                {s === 'M' ? '♂ Male' : s === 'F' ? '♀ Female' : 'Unsexed'}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Bloodline">
          <input list="bloodlines" value={d.bloodline ?? ''} onChange={(e) => up('bloodline', e.target.value)} placeholder="e.g. Kelso, Sweater, Roundhead" />
          <datalist id="bloodlines">{bloodlines.map((b) => <option key={b} value={b} />)}</datalist>
        </Field>
        <Field label="Color / feather">
          <input value={d.color ?? ''} onChange={(e) => up('color', e.target.value)} placeholder="e.g. Red, Grey, Black, Pyle" />
        </Field>
        <Field label="Hatch date" hint="Used for age and the vaccination schedule">
          <input type="date" value={d.hatchDate ?? ''} onChange={(e) => up('hatchDate', e.target.value || undefined)} />
        </Field>
      </Card>

      <Card>
        <h2>Parents</h2>
        <Field label="Sire (father)">
          <BirdPicker birds={others} sex="M" value={d.sireId} onChange={(v) => up('sireId', v)} placeholder="Unknown" />
        </Field>
        <Field label="Dam (mother)">
          <BirdPicker birds={others} sex="F" value={d.damId} onChange={(v) => up('damId', v)} placeholder="Unknown" />
        </Field>
        <p className="hint">Tip: add the grandparents too. The inbreeding check is only as good as the pedigree.</p>
      </Card>

      <Card>
        <Field label="Status">
          <select value={d.status} onChange={(e) => up('status', e.target.value as BirdStatus)}>
            <option value="active">Active</option>
            <option value="sold">Sold / transferred</option>
            <option value="dead">Dead</option>
            <option value="culled">Culled</option>
          </select>
        </Field>
        <Field label="Quality rating" group hint="Your own 1–5 score for this bird. Tap again to clear. Used to find nicks.">
          <Stars value={d.rating} onChange={(v) => up('rating', v)} />
        </Field>
        <Field label="Notes">
          <textarea rows={3} value={d.notes ?? ''} onChange={(e) => up('notes', e.target.value)} placeholder="Traits, style, temperament, buyer…" />
        </Field>
      </Card>

      {err && <p className="error">{err}</p>}
      <div className="actions sticky">
        <button type="button" className="btn ghost" onClick={() => nav(-1)}>Cancel</button>
        <button type="submit" className="btn primary">Save</button>
      </div>
    </form>
  );
}
