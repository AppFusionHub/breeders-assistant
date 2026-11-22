import { describe, expect, it } from 'vitest';
import { hashSecret, isValidPin, normalizeCode, randomSalt, recoveryCode, verifySecret } from './pin';

describe('pin', () => {
  it('hashes with salt and verifies', async () => {
    const salt = randomSalt();
    const h = await hashSecret('1234', salt);
    expect(h).toHaveLength(64);
    expect(h).not.toContain('1234');
    expect(await verifySecret('1234', salt, h)).toBe(true);
    expect(await verifySecret('4321', salt, h)).toBe(false);
    expect(await hashSecret('1234', randomSalt())).not.toBe(h);
  });
  it('validates 4-digit PINs', () => {
    expect(isValidPin('0420')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
  });
  it('makes readable recovery codes and normalizes input', () => {
    const c = recoveryCode();
    expect(c).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(normalizeCode(c.toLowerCase().replace('-', ' '))).toBe(c.replace('-', ''));
  });
});
