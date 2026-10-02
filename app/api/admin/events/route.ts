import { currentSite, isEventSite } from '@/lib/event-site';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/firebase-admin';
import { serializeDoc } from '@/lib/serializers';

const allowedStatuses = new Set([
  'draft',
  'published',
  'paused',
  'sold_out',
  'cancelled',
  'completed',
  'archived',
]);

function text(input: unknown, fallback = '') {
  return typeof input === 'string' || typeof input === 'number'
    ? String(input).trim()
    : fallback;
}

function normalize(input: Record<string, unknown>) {
  const site = input.site ?? currentSite;
  if (!isEventSite(site)) throw new Error('Invalid event site.');
  const title = text(input.title);
  const slug = text(input.slug, title)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const capacity = Math.max(1, Math.floor(Number(input.capacity || 0)));
  const priceCents = Math.max(50, Math.round(Number(input.priceCents || 0)));
  const status = text(input.status, 'draft');
  if (
    !title ||
    !slug ||
    !input.date ||
    !input.startTime ||
    !input.venue ||
    !capacity
  )
    throw new Error('Required fields are missing.');
  if (!allowedStatuses.has(status)) throw new Error('Invalid event status.');

  return {
    site,
    title,
    slug,
    capacity,
    priceCents,
    status,
    category: text(input.category, 'Social'),
    eyebrow: text(input.eyebrow),
    description: text(input.description),
    experienceTitle: text(input.experienceTitle),
    experienceDescription: text(input.experienceDescription),
    schedule: text(input.schedule),
    hostName: text(input.hostName),
    hostDescription: text(input.hostDescription),
    goodToKnow: text(input.goodToKnow),
    refundPolicy: text(input.refundPolicy),
    date: text(input.date),
    startTime: text(input.startTime),
    endTime: text(input.endTime),
    venue: text(input.venue),
    area: text(input.area),
    address: text(input.address),
    imageUrl: text(input.imageUrl),
    currency: text(
      input.currency,
      process.env.DEFAULT_CURRENCY || 'CAD',
    ).toUpperCase(),
  };
}

export async function GET() {
  try {
    await requireAdmin();
    const snapshot = await db
      .collection('events')
      .orderBy('date', 'desc')
      .get();
    return Response.json({ events: snapshot.docs.map(serializeDoc) });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error && error.message === 'UNAUTHORIZED'
            ? 'Unauthorized.'
            : 'Events could not be loaded.',
      },
      { status: 401 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    const data = normalize(await request.json());
    const duplicate = await db
      .collection('events')
      .where('slug', '==', data.slug)
      .limit(1)
      .get();
    if (!duplicate.empty)
      return Response.json(
        { error: 'This URL slug is already in use.' },
        { status: 409 },
      );
    const ref = db.collection('events').doc();
    await ref.set({
      ...data,
      soldCount: 0,
      reservedCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
    });
    return Response.json({ id: ref.id }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Event could not be created.';
    return Response.json(
      { error: message === 'UNAUTHORIZED' ? 'Unauthorized.' : message },
      { status: message === 'UNAUTHORIZED' ? 401 : 400 },
    );
  }
}
