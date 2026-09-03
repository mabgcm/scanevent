import { createHash, randomBytes } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { adminAuth, db } from '@/lib/firebase-admin';
import { appUrl } from '@/lib/env';
import { sendAdminSetupEmail } from '@/lib/email';

export async function POST(request: Request) {
  const { email } = await request.json().catch(() => ({}));
  const requested = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const allowed = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  if (!requested || requested !== allowed)
    return Response.json(
      { error: 'This email is not configured as the initial administrator.' },
      { status: 403 },
    );
  try {
    try {
      await adminAuth.getUserByEmail(requested);
    } catch (error) {
      if ((error as { code?: string }).code !== 'auth/user-not-found')
        throw error;
      await adminAuth.createUser({
        email: requested,
        emailVerified: true,
        password: randomBytes(36).toString('base64url'),
      });
    }
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await db.collection('adminSetupTokens').doc(tokenHash).set({
      email: requested,
      expiresAt: Timestamp.fromMillis(Date.now() + 30 * 60 * 1000),
      createdAt: Timestamp.now(),
      usedAt: null,
    });
    const link = `${appUrl()}/dashboard/setup?token=${encodeURIComponent(token)}`;
    await sendAdminSetupEmail(requested, link);
    return Response.json({
      ok: true,
      message: 'A password setup link was sent to your email address.',
    });
  } catch (error) {
    console.error(
      'Admin bootstrap failed',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return Response.json(
      { error: 'The setup link could not be sent.' },
      { status: 500 },
    );
  }
}
