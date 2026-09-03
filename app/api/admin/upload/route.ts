import { randomUUID } from 'node:crypto';
import { requireAdmin } from '@/lib/auth';
import { storage } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const form = await request.formData();
    const image = form.get('image');
    if (!(image instanceof File))
      return Response.json({ error: 'Görsel eksik.' }, { status: 400 });
    if (!image.type.startsWith('image/') || image.size > 5 * 1024 * 1024) {
      return Response.json(
        { error: 'En fazla 5 MB boyutunda bir görsel yükleyin.' },
        { status: 400 },
      );
    }
    const extension =
      image.name
        .split('.')
        .pop()
        ?.replace(/[^a-z0-9]/gi, '')
        .toLowerCase() || 'jpg';
    const token = randomUUID();
    const path = `events/${randomUUID()}.${extension}`;
    const file = storage.bucket().file(path);
    await file.save(Buffer.from(await image.arrayBuffer()), {
      contentType: image.type,
      resumable: false,
      metadata: {
        metadata: { firebaseStorageDownloadTokens: token },
        cacheControl: 'public,max-age=31536000,immutable',
      },
    });
    const bucket = storage.bucket().name;
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
    return Response.json({ url });
  } catch (error) {
    const unauthorized =
      error instanceof Error && error.message === 'UNAUTHORIZED';
    return Response.json(
      { error: unauthorized ? 'Yetkisiz.' : 'Görsel yüklenemedi.' },
      { status: unauthorized ? 401 : 500 },
    );
  }
}
