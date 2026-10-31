import { createHash } from 'node:crypto';
import { Resend } from 'resend';
import { appUrl, requireEnv } from '@/lib/env';

let resend: Resend | undefined;
const getResend = () => (resend ||= new Resend(requireEnv('RESEND_API_KEY')));
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[
        character
      ]!,
  );

type TicketEmail = {
  orderId: string;
  email: string;
  name: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  tickets: Array<{ token: string; shortCode: string }>;
};

export async function sendTicketEmail(input: TicketEmail) {
  const cards = input.tickets
    .map((ticket, index) => {
      const ticketUrl = `${appUrl()}/tickets/${encodeURIComponent(ticket.token)}`;
      const qrUrl = `${appUrl()}/api/tickets/${encodeURIComponent(ticket.token)}/qr`;
      return `<div style="border:1px solid #deded8;padding:20px;margin:18px 0;background:#fff">
      <p style="margin:0 0 8px;color:#70706b;font-size:12px;text-transform:uppercase;letter-spacing:1px">Ticket ${index + 1}</p>
      <img src="${qrUrl}" width="190" height="190" alt="Ticket QR code" style="display:block;margin:12px auto" />
      <p style="text-align:center;font-weight:bold;letter-spacing:2px">${escapeHtml(ticket.shortCode)}</p>
      <p style="text-align:center"><a href="${ticketUrl}" style="display:inline-block;background:#d9ff3f;color:#111;padding:12px 18px;text-decoration:none;font-weight:bold">View ticket</a></p>
    </div>`;
    })
    .join('');

  const { error } = await getResend().emails.send(
    {
      from: requireEnv('EMAIL_FROM'),
      to: input.email,
      subject: `Your ticket for ${input.eventTitle}`,
      html: `<div style="background:#f0efe9;padding:32px;font-family:Arial,sans-serif;color:#111">
      <div style="max-width:580px;margin:auto"><h1 style="font-size:32px">Your ticket is ready.</h1>
      <p>Hello ${escapeHtml(input.name)}, your payment was received. Show each QR code separately at the entrance.</p>
      <p><strong>${escapeHtml(input.eventTitle)}</strong><br>${escapeHtml(input.eventDate)} · ${escapeHtml(input.eventTime)}<br>${escapeHtml(input.venue)}</p>
      ${cards}
      <p style="color:#777;font-size:12px;margin-top:28px">This inbox is not monitored. Please do not reply to this email.</p></div>
    </div>`,
    },
    { headers: { 'Idempotency-Key': `tickets-${input.orderId}` } },
  );
  if (error) throw new Error(`Resend: ${error.message}`);
}

export async function sendAdminSetupEmail(email: string, link: string) {
  const { error } = await getResend().emails.send(
    {
      from: requireEnv('EMAIL_FROM'),
      to: email,
      subject: 'Create your ScanEvent admin password',
      html: `<div style="background:#f0efe9;padding:32px;font-family:Arial,sans-serif;color:#111"><div style="max-width:560px;margin:auto"><h1>SCANΔDMIN</h1><p>Your admin dashboard account is ready. Use the link below to create a secure password.</p><p><a href="${link}" style="display:inline-block;background:#d9ff3f;color:#111;padding:13px 18px;text-decoration:none;font-weight:bold">Create my password</a></p><p style="color:#777;font-size:12px">This inbox is not monitored. Please do not reply to this email.</p></div></div>`,
    },
    {
      headers: {
        'Idempotency-Key': `admin-setup-${createHash('sha256').update(`${email}:${link}`).digest('hex').slice(0, 32)}`,
      },
    },
  );
  if (error) throw new Error(`Resend: ${error.message}`);
}
