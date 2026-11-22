import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, birdLabel } from '../db';
import { useBirds } from '../hooks';
import { Card, Empty } from '../components';
import { fmt, today } from '../lib/dates';
import { peso, periodLabel, periodRange, shiftPeriod, summarize, type Period } from '../lib/money';

export default function Costs() {
  const t = today();
  const [period, setPeriod] = useState<Period>({ kind: 'month', year: Number(t.slice(0, 4)), month: Number(t.slice(5, 7)) });
  const [from, to] = periodRange(period);
  const txs = useLiveQuery(() => db.transactions.where('date').between(from, to, true, true).reverse().sortBy('date'), [from, to]);
  const activeCount = useLiveQuery(() => db.birds.where('status').equals('active').count(), []);
  const { map } = useBirds();
  const s = summarize(txs ?? []);
  const maxCat = s.categories[0]?.amount ?? 0;
  const months = period.kind === 'year' ? 12 : 1;

  return (
    <div className="stack">
      <div className="toolbar">
        <h1 className="grow">Costs</h1>
        <Link to="/costs/new" className="btn primary">+ Add</Link>
      </div>

      <div className="period">
        <button className="btn small" aria-label="Previous" onClick={() => setPeriod(shiftPeriod(period, -1))}>‹</button>
        <b className="grow center">{periodLabel(period)}</b>
        <button className="btn small" aria-label="Next" onClick={() => setPeriod(shiftPeriod(period, 1))}>›</button>
        <select className="chip-select" value={period.kind} onChange={(e) => setPeriod({ ...period, kind: e.target.value as Period['kind'] })}>
          <option value="month">Month</option>
          <option value="year">Year</option>
        </select>
      </div>

      <div className="stat-row">
        <div className="stat"><b className="money">{peso(s.expense, true)}</b><span>Spent</span></div>
        <div className="stat"><b className="money">{peso(s.income, true)}</b><span>Income</span></div>
        <div className="stat"><b className={`money ${s.net < 0 ? 'neg' : 'pos'}`}>{s.net < 0 ? '−' : ''}{peso(Math.abs(s.net), true)}</b><span>Net</span></div>
      </div>

      {s.expense > 0 && (
        <Card>
          <h2>Where the money went</h2>
          <ul className="bars" aria-label="Expenses by category">
            {s.categories.map((c) => (
              <li key={c.category} title={`${c.category}: ${peso(c.amount)} (${Math.round((c.amount / s.expense) * 100)}%)`}>
                <div className="bar-label"><span>{c.category}</span><span>{peso(c.amount, true)} <span className="muted">· {Math.round((c.amount / s.expense) * 100)}%</span></span></div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(c.amount / maxCat) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
          <dl className="facts small">
            {activeCount ? <><dt>Cost per active bird</dt><dd>{peso(s.expense / activeCount / months)} / month <span className="muted">({activeCount} birds)</span></dd></> : null}
            {s.feedKg > 0 && <><dt>Feed bought</dt><dd>{s.feedKg.toLocaleString('en-PH')} kg · avg {peso(s.pricePerKg!)}/kg</dd></>}
          </dl>
        </Card>
      )}

      {txs && !txs.length && (
        <Empty>No entries for {periodLabel(period)}.<br /><span className="small">Log feed sacks, vitamins, vaccines, and bird sales to see your real cost per bird.</span>
          <Link to="/costs/new" className="btn primary">+ Add first entry</Link>
        </Empty>
      )}

      {!!txs?.length && (
        <Card>
          <h2>Entries</h2>
          {txs.map((x) => (
            <Link key={x.id} to={`/costs/${x.id}`} className="row-link">
              <div className="grow">
                <b>{x.category}</b>{x.qty ? <span className="small"> · {x.qty} {x.unit}</span> : null}
                <div className="small muted">
                  {fmt(x.date)}{x.description && ` · ${x.description}`}{x.birdId != null && ` · ${birdLabel(map.get(x.birdId))}`}
                </div>
              </div>
              <b className={x.type === 'income' ? 'pos' : ''}>{x.type === 'income' ? '+' : '−'}{peso(x.amount)}</b>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
