import { randomBytes } from 'node:crypto';
import { adminAuth } from '@/lib/firebase-admin';
import { appUrl } from '@/lib/env';
import { sendAdminSetupEmail } from '@/lib/email';

export async function POST(request: Request) {
  const { email } = await request.json().catch(() => ({}));
  const requested = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const allowed = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  if (!requested || requested !== allowed)
    return Response.json(
      { error: 'Bu adres ilk yönetici olarak tanımlı değil.' },
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
    const link = await adminAuth.generatePasswordResetLink(requested, {
      url: `${appUrl()}/dashboard/login`,
    });
    await sendAdminSetupEmail(requested, link);
    return Response.json({
      ok: true,
      message: 'Şifre oluşturma bağlantısı e-posta adresinize gönderildi.',
    });
  } catch (error) {
    console.error(
      'Admin bootstrap failed',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return Response.json(
      { error: 'Kurulum bağlantısı gönderilemedi.' },
      { status: 500 },
    );
  }
}
