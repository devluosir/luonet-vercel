const ITERATIONS = 60_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;
const MAX_STORED_ITERATIONS = 1_000_000;

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error('Invalid base64url value');
  }

  const paddingLength = (4 - (value.length % 4)) % 4;
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(paddingLength);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function constantTimeEqual(actual: Uint8Array, expected: Uint8Array): boolean {
  const maxLength = Math.max(actual.length, expected.length);
  let difference = actual.length ^ expected.length;

  for (let index = 0; index < maxLength; index += 1) {
    difference |= (actual[index] ?? 0) ^ (expected[index] ?? 0);
  }

  return difference === 0;
}

async function pbkdf2(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number
): Promise<Uint8Array<ArrayBuffer>> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    HASH_BYTES * 8
  );

  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await pbkdf2(password, salt, ITERATIONS);

  return `pbkdf2$${ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!password || !stored) return false;

  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;

  const iterations = Number(parts[1]);
  if (
    !Number.isSafeInteger(iterations)
    || iterations <= 0
    || iterations > MAX_STORED_ITERATIONS
  ) {
    return false;
  }

  try {
    const salt = fromBase64Url(parts[2]);
    const expected = fromBase64Url(parts[3]);
    if (salt.length !== SALT_BYTES || expected.length !== HASH_BYTES) return false;

    const actual = await pbkdf2(password, salt, iterations);
    return constantTimeEqual(actual, expected);
  } catch {
    return false;
  }
}
