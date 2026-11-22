import { BellPlus } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, birdLabel, type Bird } from '../db';
import { useBirds, useKinship } from '../hooks';
import { Avatar, Card, SexBadge, Stars } from '../components';
import { peso } from '../lib/money';
import { stageForAge } from '../lib/feeding';
import { stageAt, stageSummary } from '../lib/feedplan';
import { ageLabel, daysBetween, fmt, today } from '../lib/dates';

function PedNode({ bird, role }: { bird?: Bird; role: string }) {
  if (!bird) return <div className="ped-node unknown"><span className="muted small">{role}</span><span>Unknown</span></div>;
  return (
    <Link to={`/birds/${bird.id}`} className={`ped-node sex-${bird.sex}`}>
      <span className="muted small">{role}</span>
      <b>{bird.band}</b>
      <span className="small">{bird.bloodline ?? ''}</span>
    </Link>
  );
}

export default function BirdDetail() {
  const id = Number(useParams().id);
  const nav = useNavigate();
  const { map } = useBirds();
  const kin = useKinship(map);
  const bird = map.get(id);
  const offspring = useLiveQuery(() => db.birds.filter((b) => b.sireId === id || b.damId === id).toArray(), [id]);
  const feeding = useLiveQuery(async () => {
    const run = (await db.runs.filter((r) => !r.stopped && r.programKey.startsWith('feed:') && r.birdIds.includes(id)).toArray())
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    if (!run) return null;
    const plan = await db.feedPlans.get(Number(run.programKey.slice(5)));
    return plan ? { run, plan } : null;
  }, [id]);
  const money = useLiveQuery(() => db.transactions.where('birdId').equals(id).toArray(), [id]);
  const health = useLiveQuery(() => db.health.where('birdId').equals(id).reverse().sortBy('date'), [id]);

  if (!map.size) return null;
  if (!bird) return <p className="muted">Bird not found.</p>;

  const g = (x?: number) => (x != null ? map.get(x) : undefined);
  const sire = g(bird.sireId), dam = g(bird.damId);
  const coi = kin.birdCOI(id);

  async function remove() {
    if (!confirm(`Delete ${bird!.band}? Its offspring will lose this parent link. Health records for this bird will be deleted.`)) return;
    await db.transaction('rw', db.birds, db.health, async () => {
      await db.birds.where('sireId').equals(id).modify({ sireId: undefined });
      await db.birds.where('damId').equals(id).modify({ damId: undefined });
      await db.health.where('birdId').equals(id).delete();
      await db.birds.delete(id);
    });
    nav('/birds', { replace: true });
  }

  return (
    <div className="stack">
      <div className="bird-head">
        <Avatar bird={bird} size={88} />
        <div className="grow">
          <h1>{bird.band}</h1>
          {bird.name && <div>{bird.name}</div>}
          <SexBadge sex={bird.sex} /> {bird.status !== 'active' && <span className="badge">{bird.status}</span>}
        </div>
        <Link to={`/birds/${id}/edit`} className="btn">Edit</Link>
      </div>

      <Card>
        <dl className="facts">
          <dt>Bloodline</dt><dd>{bird.bloodline ?? '—'}</dd>
          <dt>Color</dt><dd>{bird.color ?? '—'}</dd>
          <dt>Hatched</dt><dd>{fmt(bird.hatchDate)} {bird.hatchDate && <span className="muted">({ageLabel(bird.hatchDate)})</span>}</dd>
          {bird.status === 'active' && feeding && (() => {
            const cur = stageAt(feeding.plan, daysBetween(feeding.run.startDate, today()));
            return <><dt>Feeding plan</dt><dd>
              <Link to={`/feedplans/${feeding.plan.id}`}>{feeding.plan.name}</Link>
              {cur ? <>: <b>{cur.stage.name}</b><div className="small muted">{stageSummary(cur.stage)}</div></> : <span className="muted small"> (starts {fmt(feeding.run.startDate)})</span>}
            </dd></>;
          })()}
          {bird.status === 'active' && !feeding && (() => {
            const st = stageForAge(bird.hatchDate ? daysBetween(bird.hatchDate, today()) / 7 : null, bird.sex);
            return <><dt>Feeding</dt><dd><Link to={`/feeding?stage=${st.id}`}>{st.name}</Link> <span className="muted small">({st.protein[0]}–{st.protein[1]}% protein)</span></dd></>;
          })()}
          <dt>Inbreeding (COI)</dt><dd>{(coi * 100).toFixed(1)}%</dd>
          {money?.map((m) => (
            <span key={m.id} style={{ display: 'contents' }}>
              <dt>{m.category}</dt><dd>{m.type === 'income' ? '+' : '−'}{peso(m.amount)} <span className="muted small">{fmt(m.date)}</span></dd>
            </span>
          ))}
        </dl>
        <div className="rate-row">
          <span className="small muted">Rating</span>
          <Stars value={bird.rating} onChange={(v) => db.birds.update(id, { rating: v })} size={26} />
        </div>
        {bird.notes && <p className="notes">{bird.notes}</p>}
      </Card>

      <Card>
        <h2>Pedigree</h2>
        <div className="ped">
          <div className="ped-col"><PedNode bird={sire} role="Sire" /><PedNode bird={dam} role="Dam" /></div>
          <div className="ped-col">
            <PedNode bird={g(sire?.sireId)} role="Sire's sire" />
            <PedNode bird={g(sire?.damId)} role="Sire's dam" />
            <PedNode bird={g(dam?.sireId)} role="Dam's sire" />
            <PedNode bird={g(dam?.damId)} role="Dam's dam" />
          </div>
        </div>
      </Card>

      <Card>
        <div className="row-between">
          <h2>Offspring ({offspring?.length ?? 0})</h2>
          {bird.sex !== 'U' && (
            <Link className="small" to={`/pair?${bird.sex === 'M' ? 'sire' : 'dam'}=${id}`}>Plan mating →</Link>
          )}
        </div>
        {offspring?.map((o) => (
          <Link key={o.id} to={`/birds/${o.id}`} className="row-link">
            <span>{birdLabel(o)} {o.rating ? <span className="small star-inline">{'★'.repeat(o.rating)}</span> : null}</span>
            <span className="muted small">× {birdLabel(map.get((bird.sex === 'M' ? o.damId : o.sireId) ?? -1))}</span>
          </Link>
        ))}
      </Card>

      <Card>
        <div className="row-between">
          <h2>Health log</h2>
          <Link className="small" to={`/health?bird=${id}`}>+ Log</Link>
        </div>
        {!health?.length && <p className="muted small">No records.</p>}
        {health?.map((h) => (
          <div key={h.id} className="row-link">
            <span><b>{h.product}</b> <span className="muted small">{h.kind}</span></span>
            <span className="small">{fmt(h.date)}</span>
          </div>
        ))}
      </Card>

      {bird.status === 'active' && (
        <Link to={`/reminders/new?bird=${id}`} className="btn ghost"><BellPlus size={18} /> Add reminder for this bird</Link>
      )}
      {bird.status === 'active' && (
        <Link to={`/costs/new?type=income&bird=${id}`} className="btn ghost">Record sale of this bird</Link>
      )}
      <button className="btn danger ghost" onClick={remove}>Delete bird</button>
    </div>
  );
}
