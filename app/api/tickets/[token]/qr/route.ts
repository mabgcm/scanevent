import QRCode from 'qrcode';
import { appUrl } from '@/lib/env';
import { getTicketByToken } from '@/lib/tickets';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const record = await getTicketByToken(token);
  if (!record) return new Response('Not found', { status: 404 });
  const svg = await QRCode.toString(
    `${appUrl()}/tickets/${encodeURIComponent(token)}`,
    {
      type: 'svg',
      width: 320,
      margin: 1,
      color: { dark: '#0b0b0c', light: '#ffffff' },
    },
  );
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
