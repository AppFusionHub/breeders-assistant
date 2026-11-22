import { useState, type ReactNode } from 'react';
import type { Bird, Sex } from './db';
import { birdLabel } from './db';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function Field({ label, children, hint, group }: { label: string; children: ReactNode; hint?: string; group?: boolean }) {
  const inner = (
    <>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </>
  );
  // Button groups must not sit inside <label>: the label would forward taps to the first button.
  return group ? <div className="field" role="group" aria-label={label}>{inner}</div> : <label className="field">{inner}</label>;
}

export function SexBadge({ sex }: { sex: Sex }) {
  const t = sex === 'M' ? 'Cock/Stag' : sex === 'F' ? 'Hen/Pullet' : 'Unsexed';
  return <span className={`badge sex-${sex}`}>{sex === 'M' ? '♂' : sex === 'F' ? '♀' : '?'} {t}</span>;
}

export function Avatar({ bird, size = 48 }: { bird: Bird; size?: number }) {
  if (bird.photo) return <img className="avatar" src={bird.photo} width={size} height={size} alt="" />;
  return (
    <div className={`avatar placeholder sex-${bird.sex}`} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {bird.sex === 'F' ? '♀' : bird.sex === 'M' ? '♂' : '?'}
    </div>
  );
}

/** Searchable select of birds, filtered by sex. */
export function BirdPicker({
  birds, value, onChange, sex, placeholder = 'Select…', exclude,
}: {
  birds: Bird[]; value?: number; onChange: (id?: number) => void; sex?: Sex; placeholder?: string; exclude?: number;
}) {
  const [q, setQ] = useState('');
  const options = birds
    .filter((b) => (!sex || b.sex === sex) && b.id !== exclude)
    .filter((b) => !q || `${b.band} ${b.name ?? ''} ${b.bloodline ?? ''}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.band.localeCompare(b.band));
  return (
    <div className="picker">
      {birds.length > 12 && (
        <input type="search" placeholder="Search band / name / line" value={q} onChange={(e) => setQ(e.target.value)} />
      )}
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}>
        <option value="">{placeholder}</option>
        {options.map((b) => (
          <option key={b.id} value={b.id}>
            {birdLabel(b)}{b.bloodline ? ` (${b.bloodline})` : ''}{b.status !== 'active' ? ` [${b.status}]` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Stars({ value, onChange, size = 28 }: { value?: number; onChange?: (v?: number) => void; size?: number }) {
  return (
    <div className="stars" role={onChange ? 'radiogroup' : 'img'} aria-label={`Rating ${value ?? 0} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = (value ?? 0) >= n;
        return onChange ? (
          <button type="button" key={n} role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className={on ? 'on' : ''} style={{ fontSize: size }} onClick={() => onChange(value === n ? undefined : n)}>★</button>
        ) : <span key={n} className={on ? 'on' : ''} style={{ fontSize: size }}>★</span>;
      })}
    </div>
  );
}

/** Select several birds; shows chosen ones as removable chips. */
export function BirdMultiPicker({ birds, value, onChange }: { birds: Bird[]; value: number[]; onChange: (ids: number[]) => void }) {
  const byId = new Map(birds.map((b) => [b.id, b]));
  return (
    <div className="stack-sm">
      {value.length > 0 && (
        <div className="chips wrap">
          {value.map((id) => (
            <button type="button" key={id} className="chip on" onClick={() => onChange(value.filter((x) => x !== id))} aria-label={`Remove ${birdLabel(byId.get(id))}`}>
              {byId.get(id)?.band ?? '?'} ✕
            </button>
          ))}
        </div>
      )}
      <BirdPicker birds={birds.filter((b) => !value.includes(b.id) && b.status === 'active')} onChange={(id) => id != null && onChange([...value, id])}
        placeholder={value.length ? '+ Add another bird' : '+ Add bird (optional)'} />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
