import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bird as BirdIcon, ChevronRight, Star, type LucideIcon } from 'lucide-react';
import type { Bird, Sex } from './db';
import { birdLabel } from './db';

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="logo" style={{ width: size, height: size }} aria-hidden><BirdIcon size={size * 0.62} strokeWidth={2.25} /></span>
  );
}

export type Tone = 'red' | 'gold' | 'green' | 'blue' | 'plum' | 'gray';

export function IconBadge({ icon: Icon, tone = 'red', size = 40 }: { icon: LucideIcon; tone?: Tone; size?: number }) {
  return <span className={`icon-badge tone-${tone}`} style={{ width: size, height: size }}><Icon size={size * 0.5} strokeWidth={2} /></span>;
}

/** Big tappable navigation tile used on hub screens. */
export function Tile({ to, icon, tone, title, meta, badge }: { to: string; icon: LucideIcon; tone?: Tone; title: string; meta?: ReactNode; badge?: ReactNode }) {
  return (
    <Link to={to} className="tile">
      <IconBadge icon={icon} tone={tone} />
      <span className="tile-text"><b>{title}</b>{meta && <span className="small muted">{meta}</span>}</span>
      {badge != null && badge !== false && <span className="tile-badge">{badge}</span>}
      <ChevronRight size={18} className="tile-chev" />
    </Link>
  );
}

/** Page title row with optional primary action on the right. */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="page-header">
      <div className="grow"><h1>{title}</h1>{subtitle && <p className="small muted">{subtitle}</p>}</div>
      {action}
    </div>
  );
}

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
    <div className={`avatar placeholder sex-${bird.sex}`} style={{ width: size, height: size }}>
      <BirdIcon size={size * 0.5} strokeWidth={1.9} />
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
            className={on ? 'on' : ''} onClick={() => onChange(value === n ? undefined : n)}><Star size={size} fill={on ? 'currentColor' : 'none'} strokeWidth={1.75} /></button>
        ) : <span key={n} className={on ? 'on' : ''}><Star size={size} fill={on ? 'currentColor' : 'none'} strokeWidth={1.75} /></span>;
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
