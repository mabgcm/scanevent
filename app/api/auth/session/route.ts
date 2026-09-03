import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from '@/lib/auth';

export async function POST(request: Request) {
  const { idToken } = await request.json().catch(() => ({}));
  if (typeof idToken !== 'string')
    return Response.json({ error: 'Oturum bilgisi eksik.' }, { status: 400 });

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const initialAdmin = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
    if (
      decoded.admin !== true &&
      decoded.email?.toLowerCase() !== initialAdmin
    ) {
      return Response.json(
        { error: 'Bu hesabın yönetici yetkisi yok.' },
        { status: 403 },
      );
    }

    const session = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });
    (await cookies()).set(SESSION_COOKIE, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Geçersiz oturum.' }, { status: 401 });
  }
}

export async function DELETE() {
  (await cookies()).delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
