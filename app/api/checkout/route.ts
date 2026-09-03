import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { randomBytes } from 'node:crypto';
import { db } from '@/lib/firebase-admin';
import {
  appUrl,
  defaultCurrency,
  maxTicketsPerOrder,
  reservationMinutes,
} from '@/lib/env';
import {
  releaseExpiredReservations,
  releaseReservation,
} from '@/lib/inventory';
import { getStripe } from '@/lib/stripe';

export async function POST(request: Request) {
  let reservationId: string | undefined;
  try {
    const body = await request.json();
    const eventId = String(body.eventId || '');
    const quantity = Math.floor(Number(body.quantity || 1));
    if (!eventId || quantity < 1 || quantity > maxTicketsPerOrder()) {
      return Response.json({ error: 'Geçersiz bilet adedi.' }, { status: 400 });
    }

    await releaseExpiredReservations(eventId);
    const reservationRef = db.collection('reservations').doc();
    reservationId = reservationRef.id;
    const expiresAt = Timestamp.fromMillis(
      Date.now() + reservationMinutes() * 60_000,
    );
    const eventData = await db.runTransaction(async (transaction) => {
      const eventRef = db.collection('events').doc(eventId);
      const event = await transaction.get(eventRef);
      if (!event.exists) throw new Error('Etkinlik bulunamadı.');
      const data = event.data()!;
      if (data.status !== 'published')
        throw new Error('Bu etkinlik satışta değil.');
      const sold = Number(data.soldCount || 0);
      const reserved = Number(data.reservedCount || 0);
      const capacity = Number(data.capacity || 0);
      if (sold + reserved + quantity > capacity)
        throw new Error('Yeterli bilet kalmadı.');
      transaction.update(eventRef, {
        reservedCount: reserved + quantity,
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(reservationRef, {
        eventId,
        quantity,
        status: 'pending',
        expiresAt,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return data;
    });

    const stripe = getStripe();
    const suffix = randomBytes(6).toString('hex').slice(0, 8);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      integration_identifier: `scanevent_${suffix}`,
      line_items: [
        {
          quantity,
          price_data: {
            currency: String(
              eventData.currency || defaultCurrency(),
            ).toLowerCase(),
            unit_amount: Number(eventData.priceCents),
            product_data: {
              name: String(eventData.title),
              description: `${eventData.date} · ${eventData.venue}`,
            },
          },
        },
      ],
      custom_fields: [
        {
          key: 'buyer_name',
          label: { type: 'custom', custom: 'Ad Soyad' },
          type: 'text',
        },
      ],
      success_url: `${appUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/?event=${eventId}&checkout=cancelled`,
      expires_at: Math.floor(expiresAt.toMillis() / 1000),
      metadata: { eventId, reservationId, quantity: String(quantity) },
      automatic_tax: {
        enabled: process.env.STRIPE_AUTOMATIC_TAX_ENABLED === 'true',
      },
    });
    await reservationRef.update({
      stripeCheckoutSessionId: session.id,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return Response.json({ url: session.url });
  } catch (error) {
    if (reservationId)
      await releaseReservation(reservationId, 'checkout_failed').catch(
        () => undefined,
      );
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Ödeme başlatılamadı.',
      },
      { status: 400 },
    );
  }
}
