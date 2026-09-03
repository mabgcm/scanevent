import { FieldValue } from 'firebase-admin/firestore';
import type Stripe from 'stripe';
import { db } from '@/lib/firebase-admin';
import { requireEnv } from '@/lib/env';
import { sendTicketEmail } from '@/lib/email';
import { releaseReservation } from '@/lib/inventory';
import { getStripe } from '@/lib/stripe';
import {
  decryptTicketToken,
  encryptTicketToken,
  newTicketToken,
  hashTicketToken,
  ticketShortCode,
} from '@/lib/token';

export const runtime = 'nodejs';

async function fulfill(
  session: Stripe.Checkout.Session,
  stripeEventId: string,
) {
  const reservationId = session.metadata?.reservationId;
  const eventId = session.metadata?.eventId;
  if (!reservationId || !eventId) throw new Error('Checkout metadata eksik.');
  const quantity = Math.max(1, Number(session.metadata?.quantity || 1));
  const tokens = Array.from({ length: quantity }, () => ({
    token: newTicketToken(),
    shortCode: ticketShortCode(),
  }));
  const orderRef = db.collection('orders').doc(session.id);
  const eventRef = db.collection('events').doc(eventId);
  const reservationRef = db.collection('reservations').doc(reservationId);
  const webhookRef = db.collection('webhookEvents').doc(stripeEventId);

  await db.runTransaction(async (transaction) => {
    const [seen, reservation, event, existingOrder] = await Promise.all([
      transaction.get(webhookRef),
      transaction.get(reservationRef),
      transaction.get(eventRef),
      transaction.get(orderRef),
    ]);
    if (seen.exists || existingOrder.exists) return { created: false };
    if (
      !reservation.exists ||
      !event.exists ||
      reservation.data()?.status !== 'pending'
    )
      throw new Error('Aktif rezervasyon bulunamadı.');
    const eventData = event.data()!;
    const email = session.customer_details?.email || session.customer_email;
    const customName = session.custom_fields?.find(
      (field) => field.key === 'buyer_name',
    )?.text?.value;
    const name = customName || session.customer_details?.name || 'Misafir';
    if (!email) throw new Error('Müşteri e-postası eksik.');

    transaction.update(reservationRef, {
      status: 'completed',
      updatedAt: FieldValue.serverTimestamp(),
    });
    const soldCount = Number(eventData.soldCount || 0) + quantity;
    transaction.update(eventRef, {
      soldCount,
      reservedCount: Math.max(
        0,
        Number(eventData.reservedCount || 0) - quantity,
      ),
      status:
        soldCount >= Number(eventData.capacity) ? 'sold_out' : eventData.status,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(orderRef, {
      eventId,
      reservationId,
      quantity,
      buyerName: name,
      buyerEmail: email,
      amountTotal: session.amount_total || 0,
      currency: session.currency || eventData.currency,
      status: 'paid',
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tokens.forEach(({ token, shortCode }) => {
      const ticketRef = db.collection('tickets').doc();
      transaction.set(ticketRef, {
        eventId,
        orderId: orderRef.id,
        attendeeName: name,
        attendeeEmail: email,
        shortCode,
        tokenHash: hashTicketToken(token),
        tokenEncrypted: encryptTicketToken(token),
        status: 'valid',
        checkedInAt: null,
        checkedInBy: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    transaction.set(webhookRef, {
      type: 'payment_fulfilled',
      createdAt: FieldValue.serverTimestamp(),
    });
    return { created: true, email, name, eventData };
  });

  const savedOrder = await orderRef.get();
  if (savedOrder.exists && savedOrder.data()?.emailStatus !== 'sent') {
    const order = savedOrder.data()!;
    const event = await eventRef.get();
    const savedTickets = await db
      .collection('tickets')
      .where('orderId', '==', orderRef.id)
      .get();
    const emailTickets = savedTickets.docs.map((ticket) => ({
      token: decryptTicketToken(ticket.data().tokenEncrypted),
      shortCode: String(ticket.data().shortCode),
    }));
    await sendTicketEmail({
      orderId: session.id,
      email: String(order.buyerEmail),
      name: String(order.buyerName),
      eventTitle: String(event.data()?.title),
      eventDate: String(event.data()?.date),
      eventTime: String(event.data()?.startTime),
      venue: String(event.data()?.venue),
      tickets: emailTickets,
    });
    await orderRef.update({
      emailStatus: 'sent',
      emailSentAt: FieldValue.serverTimestamp(),
    });
  }
}

async function markRefunded(charge: Stripe.Charge, stripeEventId: string) {
  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id;
  if (!paymentIntentId || !charge.refunded) return;
  const orders = await db
    .collection('orders')
    .where('stripePaymentIntentId', '==', paymentIntentId)
    .limit(1)
    .get();
  if (orders.empty) return;
  const orderRef = orders.docs[0].ref;
  const order = orders.docs[0].data();
  const tickets = await db
    .collection('tickets')
    .where('orderId', '==', orderRef.id)
    .get();
  await db.runTransaction(async (transaction) => {
    const eventRef = db.collection('events').doc(order.eventId);
    const [seen, event] = await Promise.all([
      transaction.get(db.collection('webhookEvents').doc(stripeEventId)),
      transaction.get(eventRef),
    ]);
    if (seen.exists) return;
    transaction.update(orderRef, {
      status: 'refunded',
      updatedAt: FieldValue.serverTimestamp(),
    });
    tickets.docs.forEach((ticket) =>
      transaction.update(ticket.ref, {
        status: 'refunded',
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );
    if (event.exists)
      transaction.update(eventRef, {
        soldCount: Math.max(
          0,
          Number(event.data()?.soldCount || 0) - Number(order.quantity || 0),
        ),
        status:
          event.data()?.status === 'sold_out'
            ? 'published'
            : event.data()?.status,
        updatedAt: FieldValue.serverTimestamp(),
      });
    transaction.set(db.collection('webhookEvents').doc(stripeEventId), {
      type: 'refund',
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature)
    return Response.json({ error: 'İmza eksik.' }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      requireEnv('STRIPE_WEBHOOK_SECRET'),
    );
  } catch {
    return Response.json({ error: 'Geçersiz imza.' }, { status: 400 });
  }

  try {
    if (
      event.type === 'checkout.session.completed' &&
      event.data.object.payment_status === 'paid'
    )
      await fulfill(event.data.object, event.id);
    if (event.type === 'checkout.session.async_payment_succeeded')
      await fulfill(event.data.object, event.id);
    if (
      event.type === 'checkout.session.expired' ||
      event.type === 'checkout.session.async_payment_failed'
    ) {
      const reservationId = event.data.object.metadata?.reservationId;
      if (reservationId) await releaseReservation(reservationId, event.type);
    }
    if (event.type === 'charge.refunded')
      await markRefunded(event.data.object, event.id);
    return Response.json({ received: true });
  } catch (error) {
    console.error(
      'Stripe webhook processing failed',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return Response.json({ error: 'Webhook işlenemedi.' }, { status: 500 });
  }
}
