import Stripe from 'stripe';
import { requireEnv } from '@/lib/env';

let client: Stripe | undefined;

export function getStripe() {
  if (!client) {
    client = new Stripe(requireEnv('STRIPE_RESTRICTED_KEY'), {
      apiVersion: '2026-08-26.dahlia',
      typescript: true,
      appInfo: { name: 'ScanEvent', version: '1.0.0' },
    });
  }
  return client;
}
