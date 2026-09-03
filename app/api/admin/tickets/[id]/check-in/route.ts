import { FieldValue } from 'firebase-admin/firestore';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/firebase-admin';
import { serializeDoc } from '@/lib/serializers';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin();
    const { id } = await params;
    const result = await db.runTransaction(async (transaction) => {
      const ref = db.collection('tickets').doc(id);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new Error('Bilet bulunamadı.');
      if (snapshot.data()?.status !== 'valid')
        throw new Error(
          snapshot.data()?.status === 'checked_in'
            ? 'Bu bilet daha önce kullanılmış.'
            : 'Bu bilet geçerli değil.',
        );
      transaction.update(ref, {
        status: 'checked_in',
        checkedInAt: FieldValue.serverTimestamp(),
        checkedInBy: user.uid,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return serializeDoc(snapshot);
    });
    return Response.json({ ticket: { ...result, status: 'checked_in' } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Check-in başarısız.';
    return Response.json(
      { error: message === 'UNAUTHORIZED' ? 'Yetkisiz.' : message },
      { status: message === 'UNAUTHORIZED' ? 401 : 400 },
    );
  }
}
