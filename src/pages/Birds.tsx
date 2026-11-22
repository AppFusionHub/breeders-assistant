import { Link, useSearchParams } from 'react-router-dom';
import { useBirds } from '../hooks';
import { Avatar, Empty, PageHeader, SexBadge } from '../components';
import { Plus } from 'lucide-react';
import { ageLabel } from '../lib/dates';
import type { BirdStatus, Sex } from '../db';

export default function Birds() {
  const { birds } = useBirds();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const sex = (params.get('sex') ?? '') as Sex | '';
  const status = (params.get('status') ?? 'active') as BirdStatus | 'all';

  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v); else p.delete(k);
    setParams(p, { replace: true });
  };

  const list = (birds ?? [])
    .filter((b) => (status === 'all' || b.status === status) && (!sex || b.sex === sex))
    .filter((b) => !q || `${b.band} ${b.name ?? ''} ${b.bloodline ?? ''} ${b.color ?? ''}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.hatchDate ?? '').localeCompare(a.hatchDate ?? '') || a.band.localeCompare(b.band));

  return (
    <div className="stack">
      <PageHeader title="Flock" subtitle={birds ? `${birds.filter((b) => b.status === 'active').length} active birds` : undefined}
        action={<Link to="/birds/new" className="btn primary"><Plus size={18} /> Add</Link>} />
      <input type="search" placeholder="Search band, name, bloodline…" value={q} onChange={(e) => set('q', e.target.value)} />
      <div className="chips">
        {(['', 'M', 'F', 'U'] as const).map((s) => (
          <button key={s} className={`chip ${sex === s ? 'on' : ''}`} onClick={() => set('sex', s)}>
            {s === '' ? 'All' : s === 'M' ? '♂ Male' : s === 'F' ? '♀ Female' : 'Unsexed'}
          </button>
        ))}
        <select className="chip-select" value={status} onChange={(e) => set('status', e.target.value === 'active' ? '' : e.target.value)}>
          <option value="active">Active</option>
          <option value="sold">Sold</option>
          <option value="dead">Dead</option>
          <option value="culled">Culled</option>
          <option value="all">All statuses</option>
        </select>
      </div>

      {birds && !list.length && (
        <Empty>
          {birds.length ? 'No birds match.' : <>No birds yet. Start with your broodcocks and hens.<br /><Link to="/birds/new" className="btn primary">+ Add first bird</Link></>}
        </Empty>
      )}

      <ul className="list">
        {list.map((b) => (
          <li key={b.id}>
            <Link to={`/birds/${b.id}`} className="bird-row">
              <Avatar bird={b} />
              <div className="grow">
                <div><b>{b.band}</b>{b.name && <span> · {b.name}</span>}</div>
                <div className="muted small">{[b.bloodline, b.color, ageLabel(b.hatchDate)].filter(Boolean).join(' · ')}</div>
              </div>
              <SexBadge sex={b.sex} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
