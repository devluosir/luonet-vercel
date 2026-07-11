import { webcrypto as nodeWebCrypto } from 'node:crypto';
import { TextEncoder } from 'node:util';
import { hashPassword, verifyPassword } from '../password-hash';

describe('password-hash', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: nodeWebCrypto,
    });
    Object.defineProperty(globalThis, 'TextEncoder', {
      configurable: true,
      value: TextEncoder,
    });
  });

  it('hashes a password and verifies it', async () => {
    const stored = await hashPassword('correct horse battery staple');

    expect(stored).toMatch(/^pbkdf2\$\d+\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/);
    await expect(verifyPassword('correct horse battery staple', stored)).resolves.toBe(true);
  });

  it('rejects the wrong password', async () => {
    const stored = await hashPassword('right-password');

    await expect(verifyPassword('wrong-password', stored)).resolves.toBe(false);
  });

  it.each([
    ['', 'pbkdf2$100000$c2FsdA$aGFzaA'],
    ['password', ''],
    ['password', 'plaintext'],
    ['password', 'pbkdf2$100000$truncated'],
    ['password', 'pbkdf2$invalid$c2FsdA$aGFzaA'],
    ['password', 'pbkdf2$100000$***$***'],
  ])('returns false for invalid input without throwing', async (password, stored) => {
    await expect(verifyPassword(password, stored)).resolves.toBe(false);
  });

  it('uses a fresh salt for every hash', async () => {
    const first = await hashPassword('same-password');
    const second = await hashPassword('same-password');

    expect(first).not.toBe(second);
    expect(first.split('$')[2]).not.toBe(second.split('$')[2]);
  });
});
