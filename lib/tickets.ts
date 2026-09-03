import { db } from '@/lib/firebase-admin';
import { hashTicketToken } from '@/lib/token';
import { serializeDoc } from '@/lib/serializers';
import type { EventRecord, TicketRecord } from '@/lib/types';

export async function getTicketByToken(token: string) {
  if (!token || token.length > 200) return null;
  const snapshot = await db
    .collection('tickets')
    .where('tokenHash', '==', hashTicketToken(token))
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const ticket = snapshot.docs[0];
  const event = await db
    .collection('events')
    .doc(String(ticket.data().eventId))
    .get();
  if (!event.exists) return null;
  return {
    ticket: serializeDoc(ticket) as TicketRecord,
    event: serializeDoc(event) as EventRecord,
  };
}
