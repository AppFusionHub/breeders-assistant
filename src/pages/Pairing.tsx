import { Link, useSearchParams } from 'react-router-dom';
import { useBirds, useKinship } from '../hooks';
import { BirdPicker, Card, Field } from '../components';
import { coiAdvice } from '../lib/pedigree';
import { birdLabel } from '../db';

export default function Pairing() {
  const { birds, map } = useBirds();
  const kin = useKinship(map);
  const [sp, setSp] = useSearchParams();
  const sire = sp.get('sire') ? Number(sp.get('sire')) : undefined;
  const dam = sp.get('dam') ? Number(sp.get('dam')) : undefined;
  const set = (k: string, v?: number) => {
    const p = new URLSearchParams(sp);
    if (v != null) p.set(k, String(v)); else p.delete(k);
    setSp(p, { replace: true });
  };
  const active = (birds ?? []).filter((b) => b.status === 'active');

  const coi = sire != null && dam != null ? kin.offspringCOI(sire, dam) : null;
  const advice = coi != null ? coiAdvice(coi) : null;

  // Best-matching hens for the chosen sire, ranked by lowest COI.
  const ranked = sire != null
    ? active.filter((b) => b.sex === 'F').map((h) => ({ h, c: kin.offspringCOI(sire, h.id) })).sort((a, b) => a.c - b.c)
    : [];

  return (
    <div className="stack">
      <h1>Plan a mating</h1>
      <Card>
        <Field label="Sire (cock / stag)">
          <BirdPicker birds={active} sex="M" value={sire} onChange={(v) => set('sire', v)} />
        </Field>
        <Field label="Dam (hen / pullet)">
          <BirdPicker birds={active} sex="F" value={dam} onChange={(v) => set('dam', v)} />
        </Field>
      </Card>

      {coi != null && advice && (
        <Card className={`coi coi-${advice.level}`}>
          <div className="coi-num">{(coi * 100).toFixed(2)}%</div>
          <div className="small">Expected inbreeding of chicks</div>
          <p>{advice.text}</p>
          <p className="small muted">
            {birdLabel(map.get(sire!))} ({map.get(sire!)?.bloodline ?? 'no line'}) × {birdLabel(map.get(dam!))} ({map.get(dam!)?.bloodline ?? 'no line'})
          </p>
          <Link to={`/hatch/new?sire=${sire}&dam=${dam}`} className="btn primary">Set eggs from this pair</Link>
        </Card>
      )}

      {sire != null && ranked.length > 0 && (
        <Card>
          <h2>Hens ranked for this sire</h2>
          {ranked.map(({ h, c }) => (
            <button key={h.id} className="row-link as-btn" onClick={() => set('dam', h.id)}>
              <span>{birdLabel(h)} <span className="muted small">{h.bloodline}</span></span>
              <span className={`small coi-tag coi-${coiAdvice(c).level}`}>{(c * 100).toFixed(1)}%</span>
            </button>
          ))}
        </Card>
      )}

      <p className="small muted">COI uses the parents you've recorded. Unknown ancestors are treated as unrelated. See the guide <Link to="/guides/breeding-systems">Breeding systems & inbreeding</Link>.</p>
    </div>
  );
}
