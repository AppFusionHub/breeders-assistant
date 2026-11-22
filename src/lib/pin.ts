const enc = new TextEncoder();

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomSalt(): string {
  return hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

export async function hashSecret(secret: string, salt: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(`${salt}:${secret}`)));
}

export async function verifySecret(secret: string, salt: string, hash: string): Promise<boolean> {
  return (await hashSecret(secret, salt)) === hash;
}

/** Easy-to-read recovery code like "K7QM-3XRP" (no 0/O/1/I). */
export function recoveryCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}

export const normalizeCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

export const isValidPin = (pin: string) => /^\d{4}$/.test(pin);
