import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, EXPENSE_CATEGORIES, INCOME_CATEGORIES, SUPPLIER_TYPES, type Supplier, type Transaction, type TxType } from '../db';
import { useBirds } from '../hooks';
import { BirdPicker, Card, Field } from '../components';
import { fmt, today } from '../lib/dates';
import { peso } from '../lib/money';

type Draft = Omit<Transaction, 'id' | 'createdAt' | 'amount' | 'qty'> & { amount: string; qty: string };

const UNITS = ['kg', 'sack', 'bottle', 'pc', 'dose', 'L'];

export default function TxForm() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { birds } = useBirds();
  const [d, setD] = useState<Draft>({
    type: (sp.get('type') as TxType) ?? 'expense', date: today(), category: 'Feed', amount: '', qty: '', unit: 'kg',
    birdId: sp.get('bird') ? Number(sp.get('bird')) : undefined,
    supplierId: sp.get('supplier') ? Number(sp.get('supplier')) : undefined,
  });
  const suppliers = useLiveQuery(() => db.suppliers.orderBy('name').toArray(), []);
  const [newSup, setNewSup] = useState<string | null>(null);
  const [err, setErr] = useState('');
  // Recent entries to repeat with one tap (e.g. the usual feed sack).
  const recent = useLiveQuery(async () => {
    const all = await db.transactions.orderBy('createdAt').reverse().limit(40).toArray();
    const seen = new Set<string>();
    return all.filter((x) => {
      const k = `${x.type}|${x.category}|${x.description ?? ''}|${x.amount}|${x.qty ?? ''}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 4);
  }, []);

  useEffect(() => {
    if (!id) return;
    db.transactions.get(Number(id)).then((x) => x && setD({ ...x, amount: String(x.amount), qty: x.qty != null ? String(x.qty) : '' }));
  }, [id]);
  useEffect(() => {
    if (d.type === 'income' && !(INCOME_CATEGORIES as readonly string[]).includes(d.category)) setD((x) => ({ ...x, category: 'Bird sale' }));
    if (d.type === 'expense' && !(EXPENSE_CATEGORIES as readonly string[]).includes(d.category)) setD((x) => ({ ...x, category: 'Feed' }));
  }, [d.type, d.category]);

  const up = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const cats = d.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const showQty = d.type === 'expense' || d.category === 'Eggs';
  const showBird = d.category === 'Bird sale' || d.category === 'Birds purchased' || d.category === 'Stud service' || d.category === 'Vaccines & medicine';

  async function save(e: FormEvent) {
    e.preventDefault();
    const amount = Number(d.amount);
    if (!(amount > 0)) return setErr('Enter an amount greater than 0.');
    const qty = d.qty ? Number(d.qty) : undefined;
    const rec = {
      type: d.type, date: d.date, category: d.category, amount, description: d.description?.trim() || undefined,
      qty: showQty && qty ? qty : undefined, unit: showQty && qty ? d.unit : undefined, birdId: showBird ? d.birdId : undefined,
      supplierId: d.type === 'expense' ? d.supplierId : undefined,
    };
    if (id) await db.transactions.update(Number(id), rec);
    else await db.transactions.add({ ...rec, createdAt: Date.now() } as Transaction);
    if (!id && rec.category === 'Bird sale' && rec.birdId != null) {
      const b = await db.birds.get(rec.birdId);
      if (b && b.status === 'active' && confirm(`Mark ${b.band} as sold?`)) await db.birds.update(b.id, { status: 'sold' });
    }
    nav('/costs', { replace: true });
  }

  async function remove() {
    if (!confirm('Delete this entry?')) return;
    await db.transactions.delete(Number(id));
    nav('/costs', { replace: true });
  }

  function repeat(x: Transaction) {
    setD({ ...x, date: today(), amount: String(x.amount), qty: x.qty != null ? String(x.qty) : '' });
  }

  return (
    <form className="stack" onSubmit={save}>
      <h1>{id ? 'Edit entry' : 'Add entry'}</h1>

      {!id && !!recent?.length && (
        <div className="stack-sm">
          <span className="small muted">Repeat a recent entry</span>
          <div className="chips">
            {recent.map((x) => (
              <button type="button" key={x.id} className="chip" onClick={() => repeat(x)}>
                {x.description || x.category}{x.qty ? ` ${x.qty}${x.unit}` : ''} · {peso(x.amount, true)}
              </button>
            ))}
          </div>
        </div>
      )}

      <Card>
        <Field label="Type" group>
          <div className="seg">
            <button type="button" className={d.type === 'expense' ? 'on' : ''} onClick={() => up('type', 'expense')}>Expense</button>
            <button type="button" className={d.type === 'income' ? 'on' : ''} onClick={() => up('type', 'income')}>Income</button>
          </div>
        </Field>
        <Field label="Category">
          <select value={d.category} onChange={(e) => up('category', e.target.value)}>
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Amount (₱)">
          <input type="number" inputMode="decimal" step="0.01" min="0" value={d.amount} onChange={(e) => up('amount', e.target.value)} autoFocus={!id} placeholder="0.00" />
        </Field>
        {showQty && (
          <div className="grid2">
            <Field label="Quantity (optional)">
              <input type="number" inputMode="decimal" step="any" min="0" value={d.qty} onChange={(e) => up('qty', e.target.value)} />
            </Field>
            <Field label="Unit">
              <select value={d.unit ?? 'kg'} onChange={(e) => up('unit', e.target.value)}>
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </Field>
          </div>
        )}
        {d.category === 'Feed' && <p className="hint">Use kg as the unit (e.g. a 50 kg sack = 50 kg) to see your average price per kg.</p>}
        <Field label="Description (optional)">
          <input value={d.description ?? ''} onChange={(e) => up('description', e.target.value)}
            placeholder={d.type === 'income' ? 'Buyer, notes' : 'Brand / store, e.g. Grower pellets, 50kg'} />
        </Field>
        {d.type === 'expense' && (
          <Field label="Supplier (where you bought it)">
            {newSup == null ? (
              <select value={d.supplierId ?? ''} onChange={(e) => {
                if (e.target.value === 'new') { setNewSup(''); return; }
                up('supplierId', e.target.value ? Number(e.target.value) : undefined);
              }}>
                <option value="">Not set</option>
                {suppliers?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                <option value="new">+ New supplier…</option>
              </select>
            ) : (
              <div className="toolbar">
                <input value={newSup} onChange={(e) => setNewSup(e.target.value)} placeholder="Supplier name" autoFocus aria-label="New supplier name" />
                <button type="button" className="btn small" onClick={async () => {
                  const name = newSup.trim();
                  if (!name) { setNewSup(null); return; }
                  const existing = suppliers?.find((s) => s.name.toLowerCase() === name.toLowerCase());
                  const sid = existing?.id ?? (await db.suppliers.add({ name, type: d.category === 'Vaccines & medicine' ? SUPPLIER_TYPES[1] : SUPPLIER_TYPES[0], createdAt: Date.now() } as Supplier));
                  up('supplierId', sid as number); setNewSup(null);
                }}>Add</button>
              </div>
            )}
          </Field>
        )}
        {showBird && (
          <Field label="Bird (optional)">
            <BirdPicker birds={birds ?? []} value={d.birdId} onChange={(v) => up('birdId', v)} placeholder="None" />
          </Field>
        )}
        <Field label="Date" hint={d.date !== today() ? fmt(d.date) : undefined}>
          <input type="date" value={d.date} onChange={(e) => up('date', e.target.value)} required />
        </Field>
      </Card>
      {err && <p className="error">{err}</p>}
      <div className="actions sticky">
        {id && <button type="button" className="btn danger ghost" onClick={remove}>Delete</button>}
        <button type="button" className="btn ghost" onClick={() => nav(-1)}>Cancel</button>
        <button type="submit" className="btn primary">Save</button>
      </div>
    </form>
  );
}
