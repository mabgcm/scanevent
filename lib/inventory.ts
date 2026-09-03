import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';

export async function releaseExpiredReservations(eventId: string) {
  const candidates = await db
    .collection('reservations')
    .where('eventId', '==', eventId)
    .limit(100)
    .get();
  const now = Timestamp.now().toMillis();
  const expired = candidates.docs
    .filter(
      (snapshot) =>
        snapshot.data().status === 'pending' &&
        snapshot.data().expiresAt?.toMillis() <= now,
    )
    .slice(0, 25);

  await Promise.all(
    expired.map((snapshot) =>
      db.runTransaction(async (transaction) => {
        const reservation = await transaction.get(snapshot.ref);
        if (!reservation.exists || reservation.data()?.status !== 'pending')
          return;
        const eventRef = db.collection('events').doc(eventId);
        const event = await transaction.get(eventRef);
        if (!event.exists) return;
        const quantity = Number(reservation.data()?.quantity || 0);
        transaction.update(snapshot.ref, {
          status: 'expired',
          updatedAt: FieldValue.serverTimestamp(),
        });
        transaction.update(eventRef, {
          reservedCount: Math.max(
            0,
            Number(event.data()?.reservedCount || 0) - quantity,
          ),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }),
    ),
  );
}

export async function releaseReservation(
  reservationId: string,
  reason: string,
) {
  await db.runTransaction(async (transaction) => {
    const ref = db.collection('reservations').doc(reservationId);
    const reservation = await transaction.get(ref);
    if (!reservation.exists || reservation.data()?.status !== 'pending') return;
    const data = reservation.data()!;
    const eventRef = db.collection('events').doc(data.eventId);
    const event = await transaction.get(eventRef);
    transaction.update(ref, {
      status: reason,
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (event.exists) {
      transaction.update(eventRef, {
        reservedCount: Math.max(
          0,
          Number(event.data()?.reservedCount || 0) - Number(data.quantity || 0),
        ),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });
}
