import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';

export const SESSION_COOKIE = 'scanevent_session';
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 5;

export async function getAdminUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(token, true);
    const initialAdmin = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
    const allowed =
      decoded.admin === true ||
      (!!initialAdmin && decoded.email?.toLowerCase() === initialAdmin);
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
