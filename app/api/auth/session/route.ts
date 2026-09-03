import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';
import { isAdminEmail, SESSION_COOKIE, SESSION_MAX_AGE_MS } from '@/lib/auth';

export async function POST(request: Request) {
  const { idToken } = await request.json().catch(() => ({}));
  if (typeof idToken !== 'string')
    return Response.json(
      { error: 'Session credentials are missing.' },
      { status: 400 },
    );

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const provider = decoded.firebase?.sign_in_provider;
    if (!decoded.email_verified || provider !== 'google.com') {
      return Response.json(
        { error: 'Please sign in with a verified Google account.' },
        { status: 403 },
      );
    }
    if (decoded.admin !== true && !isAdminEmail(decoded.email)) {
      return Response.json(
        { error: 'This account does not have admin access.' },
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
    return Response.json({ error: 'Invalid session.' }, { status: 401 });
  }
}

export async function DELETE() {
  (await cookies()).delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
