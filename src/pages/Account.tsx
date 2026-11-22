import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Delete, KeyRound, Lock, LogOut, MapPin, Pencil, Phone, ShieldCheck, User } from 'lucide-react';
import { db, type FarmProfile } from '../db';
import { Card, Field, Logo } from '../components';
import { checkPin, checkRecovery, removePin, saveProfile, setPin, useLock, useProfile } from '../profile';
import { isValidPin } from '../lib/pin';
import { resizePhoto } from '../lib/photo';
import { fmt, toISO } from '../lib/dates';
import { useLiveQuery } from 'dexie-react-hooks';

export function FarmMark({ profile, size = 28 }: { profile?: FarmProfile | null; size?: number }) {
  if (profile?.logo) return <img src={profile.logo} alt="" className="farm-logo" style={{ width: size, height: size }} />;
  return <Logo size={size} />;
}

/* ---------- PIN pad ---------- */
function PinPad({ value, onChange, onDone, error }: { value: string; onChange: (v: string) => void; onDone?: (v: string) => void; error?: string }) {
  function press(d: string) {
    if (value.length >= 4) return;
    const v = value + d;
    onChange(v);
    if (v.length === 4) onDone?.(v);
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      if (e.key === 'Backspace') onChange(value.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <div className="pinpad">
      <div className={`pin-dots ${error ? 'shake' : ''}`} aria-label={`${value.length} of 4 digits entered`}>
        {[0, 1, 2, 3].map((i) => <span key={i} className={i < value.length ? 'on' : ''} />)}
      </div>
      <p className="error small center" role="alert" style={{ minHeight: 20 }}>{error}</p>
      <div className="pin-keys">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => <button type="button" key={d} onClick={() => press(d)}>{d}</button>)}
        <span />
        <button type="button" onClick={() => press('0')}>0</button>
        <button type="button" aria-label="Delete digit" onClick={() => onChange(value.slice(0, -1))}><Delete size={22} /></button>
      </div>
    </div>
  );
}

/* ---------- Lock screen ---------- */
export function LockScreen({ profile }: { profile: FarmProfile }) {
  const { unlock } = useLock();
  const [pin, setPinVal] = useState('');
  const [err, setErr] = useState('');
  const [tries, setTries] = useState(0);
  const [forgot, setForgot] = useState(false);
  const [code, setCode] = useState('');

  async function attempt(v: string) {
    if (await checkPin(profile, v)) { unlock(); return; }
    setTries((t) => t + 1);
    setErr('Wrong PIN. Try again.');
    setTimeout(() => { setPinVal(''); }, 350);
  }
  async function recover(e: FormEvent) {
    e.preventDefault();
    if (await checkRecovery(profile, code)) { await removePin(); unlock(); }
    else setErr('That recovery code is not correct.');
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <FarmMark profile={profile} size={72} />
        <h1>{profile.farmName}</h1>
        {profile.ownerName && <p className="muted">Welcome back, {profile.ownerName.split(' ')[0]}</p>}
        {!forgot ? (
          <>
            <p className="small muted">Enter your 4-digit PIN</p>
            <PinPad value={pin} onChange={(v) => { setPinVal(v); if (v) setErr(''); }} onDone={attempt} error={err} />
            {tries >= 2 && <button className="link-btn neutral small" onClick={() => { setForgot(true); setErr(''); }}>Forgot PIN?</button>}
          </>
        ) : (
          <form className="stack-sm" onSubmit={recover} style={{ width: '100%' }}>
            <p className="small">Enter the recovery code you saved when you created your PIN. This removes the PIN so you can set a new one.</p>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="XXXX-XXXX" autoCapitalize="characters" autoFocus aria-label="Recovery code" />
            {err && <p className="error small">{err}</p>}
            <button className="btn primary">Unlock with recovery code</button>
            <button type="button" className="link-btn neutral small" onClick={() => { setForgot(false); setErr(''); }}>Back to PIN</button>
            <p className="hint">Lost the code too? Your data can't be recovered without it. It is stored only on this phone.</p>
          </form>
        )}
      </div>
    </div>
  );
}

/* ---------- Profile form fields (shared by setup + edit) ---------- */
type Draft = { farmName: string; ownerName: string; location: string; phone: string; logo?: string };

function ProfileFields({ d, setD, autoFocus }: { d: Draft; setD: (d: Draft) => void; autoFocus?: boolean }) {
  const file = useRef<HTMLInputElement>(null);
  return (
    <>
      <div className="logo-field">
        <button type="button" className="logo-pick" onClick={() => file.current?.click()} aria-label="Choose farm logo or photo">
          {d.logo ? <img src={d.logo} alt="" /> : <Camera size={26} />}
        </button>
        <div className="stack-sm">
          <b>Farm logo or photo</b>
          <span className="small muted">Optional. Shown at the top of the app.</span>
          {d.logo && <button type="button" className="link-btn small" onClick={() => setD({ ...d, logo: undefined })}>Remove</button>}
        </div>
        <input ref={file} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setD({ ...d, logo: await resizePhoto(f, 256, 0.8) }); }} />
      </div>
      <Field label="Farm name *"><input value={d.farmName} onChange={(e) => setD({ ...d, farmName: e.target.value })} placeholder="e.g. Dela Cruz Gamefarm" autoFocus={autoFocus} maxLength={40} /></Field>
      <Field label="Your name"><input value={d.ownerName} onChange={(e) => setD({ ...d, ownerName: e.target.value })} autoComplete="name" /></Field>
      <Field label="Location"><input value={d.location} onChange={(e) => setD({ ...d, location: e.target.value })} placeholder="Town, Province" /></Field>
      <Field label="Contact number"><input value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} type="tel" inputMode="tel" placeholder="09XX XXX XXXX" autoComplete="tel" /></Field>
    </>
  );
}

const toDraft = (p?: FarmProfile | null): Draft => ({ farmName: p?.farmName ?? '', ownerName: p?.ownerName ?? '', location: p?.location ?? '', phone: p?.phone ?? '', logo: p?.logo });
const fromDraft = (d: Draft) => ({ farmName: d.farmName.trim(), ownerName: d.ownerName.trim() || undefined, location: d.location.trim() || undefined, phone: d.phone.trim() || undefined, logo: d.logo });

/* ---------- PIN create flow (shared) ---------- */
function PinCreate({ onCancel, onDone }: { onCancel?: () => void; onDone: () => void }) {
  const [step, setStep] = useState<'enter' | 'confirm' | 'code'>('enter');
  const [first, setFirst] = useState('');
  const [val, setVal] = useState('');
  const [err, setErr] = useState('');
  const [code, setCode] = useState('');
  const [saved, setSaved] = useState(false);

  async function done(v: string) {
    if (step === 'enter') { if (!isValidPin(v)) return; setFirst(v); setTimeout(() => { setVal(''); setStep('confirm'); }, 150); return; }
    if (v !== first) { setErr('PINs did not match. Start again.'); setTimeout(() => { setVal(''); setFirst(''); setStep('enter'); }, 600); return; }
    setCode(await setPin(v));
    setStep('code');
  }

  if (step === 'code') {
    return (
      <div className="stack-sm center">
        <ShieldCheck size={40} className="pos" style={{ margin: '0 auto' }} />
        <h2>PIN is set</h2>
        <p className="small">Write down this <b>recovery code</b> and keep it somewhere safe. It's the only way back in if you forget your PIN. It won't be shown again.</p>
        <div className="recovery-code" aria-label="Recovery code">{code}</div>
        <label className="check" style={{ justifyContent: 'center' }}><input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} /> I wrote it down</label>
        <button className="btn primary" disabled={!saved} onClick={onDone}>Done</button>
      </div>
    );
  }
  return (
    <div className="stack-sm center">
      <p><b>{step === 'enter' ? 'Choose a 4-digit PIN' : 'Enter the PIN again'}</b></p>
      <PinPad value={val} onChange={(v) => { setVal(v); if (v) setErr(''); }} onDone={done} error={err} />
      {onCancel && <button type="button" className="link-btn neutral small" onClick={onCancel}>Cancel</button>}
    </div>
  );
}

/* ---------- First-run setup ---------- */
export function Onboarding() {
  const [step, setStep] = useState<'profile' | 'pin'>('profile');
  const [d, setD] = useState<Draft>(toDraft());
  const [err, setErr] = useState('');
  const { unlock } = useLock();
  const hasData = useLiveQuery(() => db.birds.count(), []);

  async function next(e: FormEvent) {
    e.preventDefault();
    if (!d.farmName.trim()) return setErr('Please enter your farm name.');
    setStep('pin');
  }
  async function finish(withPin: boolean) {
    await saveProfile(withPin ? { setupDone: true } : { ...fromDraft(d), setupDone: true });
    unlock();
  }

  return (
    <div className="auth-screen">
      <div className="auth-card wide">
        {step === 'profile' ? (
          <form onSubmit={next} style={{ width: '100%' }}>
            <div className="center stack-sm" style={{ marginBottom: 16 }}>
              <Logo size={56} />
              <h1>Welcome!</h1>
              <p className="small muted">{hasData ? 'Set up your farm profile. Your existing records are kept.' : "Let's set up your farm. This takes a minute."}</p>
            </div>
            <ProfileFields d={d} setD={setD} autoFocus />
            {err && <p className="error">{err}</p>}
            <button className="btn primary" style={{ width: '100%' }}>Continue</button>
            <p className="hint center" style={{ marginTop: 12 }}>Everything stays on this phone. No account or internet needed.</p>
          </form>
        ) : (
          <div className="stack" style={{ width: '100%' }}>
            <div className="center stack-sm">
              <Lock size={36} style={{ margin: '0 auto', color: 'var(--primary)' }} />
              <h1>Protect with a PIN?</h1>
              <p className="small muted">Ask for a 4-digit PIN when the app opens, so others using your phone can't see your records.</p>
            </div>
            <PinStep d={d} onSkip={() => finish(false)} onDone={() => finish(true)} />
          </div>
        )}
      </div>
    </div>
  );
}

function PinStep({ d, onSkip, onDone }: { d: Draft; onSkip: () => void; onDone: () => void }) {
  const [creating, setCreating] = useState(false);
  if (creating) return <PinCreate onCancel={() => setCreating(false)} onDone={onDone} />;
  return (
    <>
      <button className="btn primary" onClick={async () => { await saveProfile(fromDraft(d)); setCreating(true); }}><KeyRound size={18} /> Set a PIN</button>
      <button className="btn ghost" onClick={onSkip}>Skip for now</button>
    </>
  );
}

/* ---------- Profile screen ---------- */
export function Profile() {
  const profile = useProfile();
  const nav = useNavigate();
  const { lock } = useLock();
  const [editing, setEditing] = useState(false);
  const [d, setD] = useState<Draft>(toDraft());
  const [pinMode, setPinMode] = useState<null | 'create' | 'verify-remove' | 'verify-change'>(null);
  const [verify, setVerify] = useState('');
  const [err, setErr] = useState('');
  const counts = useLiveQuery(async () => ({ birds: await db.birds.where('status').equals('active').count(), batches: await db.batches.count() }), []);
  if (!profile) return null;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!d.farmName.trim()) return setErr('Farm name is required.');
    await saveProfile(fromDraft(d));
    setEditing(false);
  }
  async function verified(v: string) {
    if (!(await checkPin(profile!, v))) { setErr('Wrong PIN.'); setTimeout(() => setVerify(''), 350); return; }
    setVerify(''); setErr('');
    if (pinMode === 'verify-remove') { await removePin(); setPinMode(null); }
    else setPinMode('create');
  }

  if (editing) {
    return (
      <form className="stack" onSubmit={save}>
        <h1>Edit profile</h1>
        <Card><ProfileFields d={d} setD={setD} /></Card>
        {err && <p className="error">{err}</p>}
        <div className="actions sticky">
          <button type="button" className="btn ghost" onClick={() => setEditing(false)}>Cancel</button>
          <button className="btn primary">Save</button>
        </div>
      </form>
    );
  }

  return (
    <div className="stack">
      <div className="profile-head">
        <FarmMark profile={profile} size={84} />
        <div className="grow">
          <h1>{profile.farmName}</h1>
          {profile.ownerName && <div className="h-icon muted"><User size={15} /> {profile.ownerName}</div>}
        </div>
      </div>
      <Card>
        <dl className="facts">
          <dt className="h-icon"><MapPin size={15} /> Location</dt><dd>{profile.location || <span className="muted">—</span>}</dd>
          <dt className="h-icon"><Phone size={15} /> Contact</dt><dd>{profile.phone ? <a href={`tel:${profile.phone}`}>{profile.phone}</a> : <span className="muted">—</span>}</dd>
          <dt>Active birds</dt><dd>{counts?.birds ?? '–'}</dd>
          <dt>Hatch batches</dt><dd>{counts?.batches ?? '–'}</dd>
          <dt>Member since</dt><dd>{fmt(toISO(new Date(profile.createdAt)))}</dd>
        </dl>
        <button className="btn" style={{ marginTop: 14, width: '100%' }} onClick={() => { setD(toDraft(profile)); setErr(''); setEditing(true); }}><Pencil size={17} /> Edit profile</button>
      </Card>

      <Card>
        <h2 className="h-icon"><Lock size={18} /> PIN lock</h2>
        {pinMode === 'create' ? (
          <PinCreate onCancel={() => setPinMode(null)} onDone={() => setPinMode(null)} />
        ) : pinMode ? (
          <div className="center">
            <p><b>Enter your current PIN</b></p>
            <PinPad value={verify} onChange={(v) => { setVerify(v); if (v) setErr(''); }} onDone={verified} error={err} />
            <button className="link-btn neutral small" onClick={() => { setPinMode(null); setErr(''); setVerify(''); }}>Cancel</button>
          </div>
        ) : profile.pinHash ? (
          <>
            <p className="small"><span className="pos">● On.</span> The app asks for your PIN when it opens and after 5 minutes in the background.</p>
            <div className="actions">
              <button className="btn" onClick={() => setPinMode('verify-change')}>Change PIN</button>
              <button className="btn ghost danger" onClick={() => setPinMode('verify-remove')}>Turn off</button>
            </div>
          </>
        ) : (
          <>
            <p className="small muted">Off. Anyone with your phone can open the app.</p>
            <button className="btn primary" onClick={() => setPinMode('create')}><KeyRound size={18} /> Set a PIN</button>
          </>
        )}
        <p className="hint">The PIN keeps others from casually opening the app. Records are stored only on this phone and aren't encrypted. Keep regular backups.</p>
      </Card>

      <Link to="/settings" className="btn">Backup & settings</Link>
      {profile.pinHash && <button className="btn ghost" onClick={() => { lock(); nav('/'); }}><LogOut size={18} /> Lock app now</button>}
    </div>
  );
}
