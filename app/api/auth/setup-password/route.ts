import { createHash } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { adminAuth, db } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  const { token, password } = await request.json().catch(() => ({}));
  if (typeof token !== 'string' || typeof password !== 'string')
    return Response.json({ error: 'Geçersiz istek.' }, { status: 400 });
  if (password.length < 10)
    return Response.json(
      { error: 'Parola en az 10 karakter olmalı.' },
      { status: 400 },
    );

  const tokenHash = createHash('sha256').update(token).digest('hex');
  const tokenRef = db.collection('adminSetupTokens').doc(tokenHash);
  try {
    const email = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(tokenRef);
      const data = snapshot.data();
      const expiresAt = data?.expiresAt as Timestamp | undefined;
      if (
        !snapshot.exists ||
        typeof data?.email !== 'string' ||
        data.usedAt ||
        !expiresAt ||
        expiresAt.toMillis() <= Date.now()
      )
        throw new Error('INVALID_SETUP_TOKEN');
      transaction.update(tokenRef, { usedAt: Timestamp.now() });
      return data.email as string;
    });

    const allowed = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
    if (email.toLowerCase() !== allowed) throw new Error('INVALID_SETUP_TOKEN');
    const user = await adminAuth.getUserByEmail(email);
    await adminAuth.updateUser(user.uid, { password, emailVerified: true });
    return Response.json({ ok: true });
  } catch (error) {
    const invalid =
      error instanceof Error && error.message === 'INVALID_SETUP_TOKEN';
    if (!invalid)
      console.error(
        'Admin password setup failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
    return Response.json(
      {
        error: invalid
          ? 'Bu bağlantı geçersiz, kullanılmış veya süresi dolmuş.'
          : 'Parola oluşturulamadı.',
      },
      { status: invalid ? 400 : 500 },
    );
  }
}
