import { db } from '@/lib/firebase-admin';
import { serializeDoc } from '@/lib/serializers';
import type { EventRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const snapshot = await db
    .collection('events')
    .where('status', 'in', ['published', 'sold_out'])
    .get();
  const events = snapshot.docs
    .map((doc) => serializeDoc(doc) as EventRecord)
    .sort((a, b) => a.date.localeCompare(b.date));
  return Response.json(
    { events },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    },
  );
}
