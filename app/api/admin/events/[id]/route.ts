import { FieldValue } from 'firebase-admin/firestore';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/firebase-admin';
import { serializeDoc } from '@/lib/serializers';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const [event, tickets, orders] = await Promise.all([
      db.collection('events').doc(id).get(),
      db.collection('tickets').where('eventId', '==', id).get(),
      db.collection('orders').where('eventId', '==', id).get(),
    ]);
    if (!event.exists)
      return Response.json({ error: 'Event not found.' }, { status: 404 });
    return Response.json({
      event: serializeDoc(event),
      tickets: tickets.docs.map(serializeDoc),
      orders: orders.docs.map(serializeDoc),
    });
  } catch {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const input = await request.json();
    const ref = db.collection('events').doc(id);
    const current = await ref.get();
    if (!current.exists)
      return Response.json({ error: 'Event not found.' }, { status: 404 });
    const sold = Number(current.data()?.soldCount || 0);
    const capacity = Math.floor(
      Number(input.capacity ?? current.data()?.capacity),
    );
    if (capacity < sold)
      return Response.json(
        { error: 'Capacity cannot be lower than the number of sold tickets.' },
        { status: 400 },
      );
    const allowed = [
      'title',
      'slug',
      'category',
      'eyebrow',
      'description',
      'experienceTitle',
      'experienceDescription',
      'schedule',
      'hostName',
      'hostDescription',
      'goodToKnow',
      'refundPolicy',
      'date',
      'startTime',
      'endTime',
      'venue',
      'area',
      'address',
      'imageUrl',
      'priceCents',
      'currency',
      'capacity',
      'status',
    ];
    const updates = Object.fromEntries(
      Object.entries(input).filter(([key]) => allowed.includes(key)),
    );
    await ref.update({ ...updates, updatedAt: FieldValue.serverTimestamp() });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error && error.message === 'UNAUTHORIZED'
            ? 'Unauthorized.'
            : 'Update failed.',
      },
      { status: 401 },
    );
  }
}
