import crypto from 'crypto';

/**
 * Hash password using scrypt with random 16-byte salt.
 * Formatted as salt:hash
 */
export function hashPassword(password: string): string {
  if (!password) return '';
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify plaintext password against stored hash.
 * Supports backward-compatibility for legacy plain passwords.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !password) return false;
  // Legacy plain text check
  if (!storedHash.includes(':')) {
    return password === storedHash;
  }
  try {
    const [salt, hash] = storedHash.split(':');
    const verifyHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch (e) {
    return false;
  }
}

/**
 * Generates a random secure human-readable password
 * Example: Ukr-94xK!2
 */
export function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `Ukr-${rand}!`;
}
