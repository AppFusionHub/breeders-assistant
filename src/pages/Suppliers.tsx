import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { MapPin, MessageSquare, Phone, Plus, Store, TrendingDown, TrendingUp, User } from 'lucide-react';
import { db, SUPPLIER_TYPES, type Supplier, type Transaction } from '../db';
import { Card, Empty, Field, IconBadge, PageHeader, type Tone } from '../components';
import { fmt, fmtShort } from '../lib/dates';
import { peso } from '../lib/money';
import { smsLink, supplierStats, telLink } from '../lib/suppliers';

const TYPE_TONE: Record<string, Tone> = {
  'Agrivet / feed store': 'gold', 'Vet clinic / pharmacy': 'blue', 'Online shop': 'plum', 'Breeder / farm': 'red', Other: 'gray',
};

export default function Suppliers() {
  const [q, setQ] = useState('');
  const data = useLiveQuery(async () => {
    const [sups, txs] = await Promise.all([db.suppliers.toArray(), db.transactions.where('supplierId').above(0).toArray()]);
    const by = new Map<number, Transaction[]>();
    for (const t of txs) by.set(t.supplierId!, [...(by.get(t.supplierId!) ?? []), t]);
    return sups.map((s) => ({ s, st: supplierStats(by.get(s.id) ?? []) }))
      .sort((a, b) => (b.st.lastDate ?? '').localeCompare(a.st.lastDate ?? '') || a.s.name.localeCompare(b.s.name));
  }, []);
  const list = (data ?? []).filter(({ s }) => !q || `${s.name} ${s.location ?? ''} ${s.type}`.toLowerCase().includes(q.toLowerCase()));
  const feed = (data ?? []).filter((x) => x.st.feedPerKg != null).sort((a, b) => a.st.feedPerKg! - b.st.feedPerKg!);

  return (
    <div className="stack">
      <PageHeader title="Suppliers" subtitle="Where you buy feeds, vitamins, vaccines and supplies."
        action={<Link to="/suppliers/new" className="btn primary"><Plus size={18} /> Add</Link>} />
      {(data?.length ?? 0) > 5 && <input type="search" placeholder="Search suppliers…" value={q} onChange={(e) => setQ(e.target.value)} />}

      {data && !data.length && (
        <Empty>
          No suppliers yet. Add the agrivet, feed store or vet clinic you buy from. Then pick it when you log a cost to track prices.
          <Link to="/suppliers/new" className="btn primary"><Plus size={18} /> Add first supplier</Link>
        </Empty>
      )}

      {feed.length > 1 && (
        <Card>
          <h2>Feed price per kg</h2>
          {feed.map(({ s, st }, i) => (
            <Link key={s.id} to={`/suppliers/${s.id}`} className="row-link">
              <span>{s.name}{i === 0 && <span className="kind-tag kind-vaccine" style={{ marginLeft: 6 }}>cheapest</span>}</span>
              <b>{peso(st.feedPerKg!)}/kg</b>
            </Link>
          ))}
        </Card>
      )}

      <ul className="list">
        {list.map(({ s, st }) => (
          <li key={s.id}>
            <Link to={`/suppliers/${s.id}`} className="bird-row">
              <IconBadge icon={Store} tone={TYPE_TONE[s.type] ?? 'gray'} size={44} />
              <div className="grow">
                <b>{s.name}</b>
                <div className="small muted">{[s.type, s.location].filter(Boolean).join(' · ')}</div>
                <div className="small muted">{st.count ? `${st.count} purchase${st.count > 1 ? 's' : ''} · ${peso(st.total, true)} · last ${fmtShort(st.lastDate)}` : 'No purchases yet'}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Draft = Omit<Supplier, 'id' | 'createdAt'>;
const blank: Draft = { name: '', type: SUPPLIER_TYPES[0] };

export function SupplierForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const [d, setD] = useState<Draft>(blank);
  const [err, setErr] = useState('');
  useEffect(() => { if (id) db.suppliers.get(Number(id)).then((s) => s && setD(s)); }, [id]);
  const up = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  async function save(e: FormEvent) {
    e.preventDefault();
    const name = d.name.trim();
    if (!name) return setErr('Enter the supplier name.');
    const dup = (await db.suppliers.toArray()).find((s) => s.name.toLowerCase() === name.toLowerCase() && s.id !== Number(id));
    if (dup) return setErr(`"${dup.name}" already exists.`);
    const rec = { ...d, name, contactPerson: d.contactPerson?.trim() || undefined, phone: d.phone?.trim() || undefined, location: d.location?.trim() || undefined, notes: d.notes?.trim() || undefined };
    if (id) { await db.suppliers.update(Number(id), rec); nav(`/suppliers/${id}`, { replace: true }); }
    else { const nid = await db.suppliers.add({ ...rec, createdAt: Date.now() } as Supplier); nav(`/suppliers/${nid}`, { replace: true }); }
  }

  async function remove() {
    const n = await db.transactions.where('supplierId').equals(Number(id)).count();
    if (!confirm(n ? `Delete this supplier? Its ${n} cost entr${n > 1 ? 'ies are' : 'y is'} kept but no longer linked to a supplier.` : 'Delete this supplier?')) return;
    await db.transaction('rw', db.suppliers, db.transactions, async () => {
      await db.transactions.where('supplierId').equals(Number(id)).modify({ supplierId: undefined });
      await db.suppliers.delete(Number(id));
    });
    nav('/suppliers', { replace: true });
  }

  return (
    <form className="stack" onSubmit={save}>
      <h1>{id ? 'Edit supplier' : 'New supplier'}</h1>
      <Card>
        <Field label="Store / supplier name *"><input value={d.name} onChange={(e) => up('name', e.target.value)} autoFocus={!id} placeholder="e.g. Lipa Agrivet Supply" /></Field>
        <Field label="Type">
          <select value={d.type} onChange={(e) => up('type', e.target.value)}>{SUPPLIER_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        </Field>
        <Field label="Contact person"><input value={d.contactPerson ?? ''} onChange={(e) => up('contactPerson', e.target.value)} /></Field>
        <Field label="Phone"><input type="tel" inputMode="tel" value={d.phone ?? ''} onChange={(e) => up('phone', e.target.value)} placeholder="09XX XXX XXXX" /></Field>
        <Field label="Location / address"><input value={d.location ?? ''} onChange={(e) => up('location', e.target.value)} placeholder="Town, Province or shop link" /></Field>
        <Field label="Notes"><textarea rows={2} value={d.notes ?? ''} onChange={(e) => up('notes', e.target.value)} placeholder="Delivery, credit terms, best brands they carry…" /></Field>
      </Card>
      {err && <p className="error">{err}</p>}
      <div className="actions sticky">
        {id && <button type="button" className="btn danger ghost" onClick={remove}>Delete</button>}
        <button type="button" className="btn ghost" onClick={() => nav(-1)}>Cancel</button>
        <button className="btn primary">Save</button>
      </div>
    </form>
  );
}

export function SupplierDetail() {
  const id = Number(useParams().id);
  const s = useLiveQuery(() => db.suppliers.get(id), [id]);
  const txs = useLiveQuery(() => db.transactions.where('supplierId').equals(id).toArray(), [id]);
  if (s === undefined || !txs) return null;
  if (!s) return <p className="muted">Supplier not found.</p>;
  const st = supplierStats(txs);
  const history = [...txs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

  return (
    <div className="stack">
      <div className="profile-head">
        <IconBadge icon={Store} tone={TYPE_TONE[s.type] ?? 'gray'} size={64} />
        <div className="grow"><h1>{s.name}</h1><span className="small muted">{s.type}</span></div>
        <Link to={`/suppliers/${id}/edit`} className="btn small">Edit</Link>
      </div>

      {(s.phone || s.contactPerson || s.location || s.notes) && (
        <Card>
          <dl className="facts">
            {s.contactPerson && <><dt className="h-icon"><User size={15} /> Contact</dt><dd>{s.contactPerson}</dd></>}
            {s.phone && <><dt className="h-icon"><Phone size={15} /> Phone</dt><dd>{s.phone}</dd></>}
            {s.location && <><dt className="h-icon"><MapPin size={15} /> Location</dt><dd>{s.location}</dd></>}
          </dl>
          {s.notes && <p className="notes">{s.notes}</p>}
          {s.phone && (
            <div className="actions" style={{ marginTop: 12 }}>
              <a className="btn" href={telLink(s.phone)}><Phone size={17} /> Call</a>
              <a className="btn" href={smsLink(s.phone)}><MessageSquare size={17} /> Text</a>
            </div>
          )}
        </Card>
      )}

      <div className="stat-row">
        <div className="stat"><b className="money">{peso(st.total, true)}</b><span>Total spent</span></div>
        <div className="stat"><b>{st.count}</b><span>Purchases</span></div>
        <div className="stat"><b className="money">{st.feedPerKg != null ? peso(st.feedPerKg) : '—'}</b><span>Feed per kg</span></div>
      </div>

      <Link to={`/costs/new?supplier=${id}`} className="btn primary"><Plus size={18} /> Log a purchase here</Link>

      {st.items.length > 0 && (
        <Card>
          <h2>Items & latest prices</h2>
          {st.items.map((it) => (
            <div key={it.key} className="row-link">
              <div className="grow">
                <b>{it.label}</b>
                <div className="small muted">{it.category} · bought {it.count}× · last {fmtShort(it.last.date)}</div>
              </div>
              <div className="right">
                <b>{it.last.unitPrice != null ? `${peso(it.last.unitPrice)}/${it.unit}` : peso(it.last.amount)}</b>
                {it.trend === 'up' && <div className="small danger h-icon" style={{ justifyContent: 'flex-end' }}><TrendingUp size={14} /> was {it.prev?.unitPrice != null ? peso(it.prev.unitPrice) : peso(it.prev!.amount)}</div>}
                {it.trend === 'down' && <div className="small pos h-icon" style={{ justifyContent: 'flex-end' }}><TrendingDown size={14} /> was {it.prev?.unitPrice != null ? peso(it.prev.unitPrice) : peso(it.prev!.amount)}</div>}
              </div>
            </div>
          ))}
        </Card>
      )}

      <Card>
        <h2>Purchase history</h2>
        {!history.length && <p className="small muted">No purchases linked yet. When you log a cost, choose this supplier.</p>}
        {history.map((t) => (
          <Link key={t.id} to={`/costs/${t.id}`} className="row-link">
            <div className="grow">
              <b>{t.description || t.category}</b>{t.qty ? <span className="small"> · {t.qty} {t.unit}</span> : null}
              <div className="small muted">{fmt(t.date)} · {t.category}</div>
            </div>
            <b className={t.type === 'income' ? 'pos' : ''}>{t.type === 'income' ? '+' : '−'}{peso(t.amount)}</b>
          </Link>
        ))}
      </Card>
    </div>
  );
}
