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

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
