import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';

export const SESSION_COOKIE = 'scanevent_session';
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 5;

export function adminEmails() {
  return [
    ...(process.env.ADMIN_EMAILS || '').split(','),
    process.env.INITIAL_ADMIN_EMAIL || '',
  ]
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string) {
  return !!email && adminEmails().includes(email.trim().toLowerCase());
}

export async function getAdminUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(token, true);
    const allowed =
      decoded.email_verified === true &&
      decoded.firebase?.sign_in_provider === 'google.com' &&
      (decoded.admin === true || isAdminEmail(decoded.email));
    return allowed ? decoded : null;
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const user = await getAdminUser();
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}
