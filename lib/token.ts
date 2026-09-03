import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { requireEnv } from '@/lib/env';

function encryptionKey() {
  return createHash('sha256').update(requireEnv('APP_SECRET')).digest();
}

export function newTicketToken() {
  return randomBytes(32).toString('base64url');
}

export function hashTicketToken(token: string) {
  return createHash('sha256')
    .update(`${requireEnv('TICKET_SIGNING_SECRET')}:${token}`)
    .digest('hex');
}

export function encryptTicketToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(token, 'utf8'),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString('base64url'))
    .join('.');
}

export function decryptTicketToken(payload: string) {
  const [iv, tag, encrypted] = payload
    .split('.')
    .map((part) => Buffer.from(part, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    'utf8',
  );
}

export function ticketShortCode() {
  return randomBytes(5).toString('hex').toUpperCase();
}
