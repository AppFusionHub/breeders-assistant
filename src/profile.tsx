import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type FarmProfile } from './db';
import { hashSecret, normalizeCode, randomSalt, recoveryCode, verifySecret } from './lib/pin';

const KEY = 'profile';
const SESSION = 'ba-unlocked';
const AUTO_LOCK_MS = 5 * 60 * 1000;

/** undefined = loading, null = not set up yet */
export function useProfile(): FarmProfile | null | undefined {
  return useLiveQuery(async () => ((await db.meta.get(KEY))?.value as FarmProfile | undefined) ?? null, []);
}

export async function getProfile(): Promise<FarmProfile | null> {
  return ((await db.meta.get(KEY))?.value as FarmProfile | undefined) ?? null;
}

export async function saveProfile(patch: Partial<FarmProfile>) {
  const cur = await getProfile();
  const next = { createdAt: Date.now(), farmName: '', ...cur, ...patch } as FarmProfile;
  await db.meta.put({ key: KEY, value: next });
  return next;
}

/** Sets a PIN and returns a fresh recovery code to show the user once. */
export async function setPin(pin: string): Promise<string> {
  const salt = randomSalt();
  const code = recoveryCode();
  await saveProfile({ pinSalt: salt, pinHash: await hashSecret(pin, salt), recoveryHash: await hashSecret(normalizeCode(code), salt) });
  return code;
}

export async function removePin() {
  await saveProfile({ pinSalt: undefined, pinHash: undefined, recoveryHash: undefined });
}

export async function checkPin(p: FarmProfile, pin: string) {
  return !!p.pinHash && !!p.pinSalt && verifySecret(pin, p.pinSalt, p.pinHash);
}

export async function checkRecovery(p: FarmProfile, code: string) {
  return !!p.recoveryHash && !!p.pinSalt && verifySecret(normalizeCode(code), p.pinSalt, p.recoveryHash);
}

const read = () => { try { return sessionStorage.getItem(SESSION) === '1'; } catch { return false; } };
const write = (v: boolean) => { try { if (v) sessionStorage.setItem(SESSION, '1'); else sessionStorage.removeItem(SESSION); } catch { /* ignore */ } };

interface LockState { unlocked: boolean; unlock: () => void; lock: () => void }
const LockCtx = createContext<LockState>({ unlocked: true, unlock: () => {}, lock: () => {} });
export const useLock = () => useContext(LockCtx);

export function LockProvider({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(read);
  const unlock = useCallback(() => { write(true); setUnlocked(true); }, []);
  const lock = useCallback(() => { write(false); setUnlocked(false); }, []);
  // Auto-lock when the app has been in the background for a while.
  useEffect(() => {
    let hiddenAt = 0;
    const onVis = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > AUTO_LOCK_MS) lock();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [lock]);
  return <LockCtx.Provider value={{ unlocked, unlock, lock }}>{children}</LockCtx.Provider>;
}
