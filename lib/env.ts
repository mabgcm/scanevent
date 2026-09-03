const serverKeys = [
  'APP_SECRET',
  'TICKET_SIGNING_SECRET',
  'STRIPE_RESTRICTED_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'FIREBASE_ADMIN_PROJECT_ID',
  'FIREBASE_ADMIN_CLIENT_EMAIL',
  'FIREBASE_ADMIN_PRIVATE_KEY',
  'RESEND_API_KEY',
  'EMAIL_FROM',
] as const;

export function requireEnv(name: (typeof serverKeys)[number]) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const appUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(
    /\/$/,
    '',
  );
export const defaultCurrency = () =>
  (process.env.DEFAULT_CURRENCY || 'CAD').toLowerCase();
export const reservationMinutes = () =>
  Math.max(30, Number(process.env.CHECKOUT_RESERVATION_MINUTES || 30));
export const maxTicketsPerOrder = () =>
  Math.max(1, Number(process.env.MAX_TICKETS_PER_ORDER || 6));
