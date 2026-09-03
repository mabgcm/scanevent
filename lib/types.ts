export type EventStatus =
  | 'draft'
  | 'published'
  | 'paused'
  | 'sold_out'
  | 'cancelled'
  | 'completed';

export type EventRecord = {
  id: string;
  slug: string;
  title: string;
  category: string;
  eyebrow: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  area: string;
  address: string;
  imageUrl: string;
  priceCents: number;
  currency: string;
  capacity: number;
  soldCount: number;
  reservedCount: number;
  status: EventStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type TicketStatus = 'valid' | 'checked_in' | 'cancelled' | 'refunded';

export type TicketRecord = {
  id: string;
  eventId: string;
  orderId: string;
  attendeeName: string;
  attendeeEmail: string;
  shortCode: string;
  status: TicketStatus;
  checkedInAt?: string | null;
  checkedInBy?: string | null;
  createdAt?: string;
};
