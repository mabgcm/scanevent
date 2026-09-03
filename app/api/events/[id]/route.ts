import { db } from '@/lib/firebase-admin';
import { serializeDoc } from '@/lib/serializers';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const snapshot = await db.collection('events').doc(id).get();
  if (
    !snapshot.exists ||
    !['published', 'sold_out'].includes(snapshot.data()?.status)
  ) {
    return Response.json({ error: 'Etkinlik bulunamadı.' }, { status: 404 });
  }
  return Response.json({ event: serializeDoc(snapshot) });
}
