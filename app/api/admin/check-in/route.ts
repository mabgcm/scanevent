import { requireAdmin } from '@/lib/auth';
import { getTicketByToken } from '@/lib/tickets';

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const { token } = await request.json();
    const record = await getTicketByToken(String(token || ''));
    if (!record)
      return Response.json({ error: 'Ticket not found.' }, { status: 404 });
    return Response.json(record);
  } catch {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }
}
