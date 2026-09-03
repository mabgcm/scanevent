import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Ticket,
  XCircle,
} from 'lucide-react';
import { getTicketByToken } from '@/lib/tickets';
import './ticket.css';

export const dynamic = 'force-dynamic';

export default async function TicketPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const record = await getTicketByToken(token);
  if (!record) notFound();
  const { ticket, event } = record;
  const valid = ticket.status === 'valid';
  return (
    <main className="digital-ticket-page">
      <section className="digital-ticket">
        <header>
          <span>SCANEVENT</span>
          <Ticket />
        </header>
        <div className="digital-ticket-copy">
          <span className={`ticket-state ${valid ? 'valid' : 'invalid'}`}>
            {valid ? <CheckCircle2 /> : <XCircle />}
            {String(ticket.status).replace('_', ' ')}
          </span>
          <h1>{String(event.title)}</h1>
          <p className="ticket-holder">{String(ticket.attendeeName)}</p>
          <div className="ticket-meta">
            <span>
              <CalendarDays />
              {String(event.date)}
            </span>
            <span>
              <Clock3 />
              {String(event.startTime)}
              {event.endTime ? ` – ${String(event.endTime)}` : ''}
            </span>
            <span>
              <MapPin />
              {String(event.venue)}, {String(event.area)}
            </span>
          </div>
          <div className="ticket-qr">
            <Image
              src={`/api/tickets/${encodeURIComponent(token)}/qr`}
              alt="Bilet QR kodu"
              width={260}
              height={260}
              unoptimized
            />
          </div>
          <strong className="ticket-code">{String(ticket.shortCode)}</strong>
          <small>Bu QR kodu yalnızca bir giriş için geçerlidir.</small>
        </div>
      </section>
    </main>
  );
}
