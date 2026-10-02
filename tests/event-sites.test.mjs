import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }, Response });
  return exports;
}
const site = load('lib/event-site.ts');
const docs = [
  { id: 'legacy', status: 'published', date: '2026-11-01' },
  { id: 'scan', site: 'scanevent', status: 'published', date: '2026-11-02' },
  { id: 'night', site: 'n8up', status: 'published', date: '2026-11-03' },
  { id: 'invalid', site: 'other', status: 'published', date: '2026-11-04' },
];
const wrap = data => ({ exists: !!data, data: () => data, id: data?.id });
const db = { collection: () => ({
  where: () => ({ get: async () => ({ docs: docs.map(wrap) }) }),
  doc: id => ({ get: async () => wrap(docs.find(doc => doc.id === id)) }),
}) };
const dependencies = {
  '@/lib/event-site': site,
  '@/lib/firebase-admin': { db },
  '@/lib/serializers': { serializeDoc: doc => doc.data() },
};
test('public list contains only this website; legacy records stay with ScanEvent', async () => {
  const route = load('app/api/events/route.ts', dependencies);
  const result = await (await route.GET()).json();
  assert.deepEqual(result.events.map(event => event.id), site.currentSite === 'n8up' ? ['night'] : ['legacy', 'scan']);
});
test('cross-site event IDs and invalid assignments cannot bypass the public list', async () => {
  const route = load('app/api/events/[id]/route.ts', dependencies);
  for (const data of docs) {
    const response = await route.GET(null, { params: Promise.resolve({ id: data.id }) });
    const shouldAllow = data.site === site.currentSite || (!data.site && site.currentSite === 'scanevent');
    assert.equal(response.status, shouldAllow ? 200 : 404);
  }
});
test('payment ownership remains with reservation/order after event reassignment', () => {
  const reservation = { site: site.currentSite };
  const movedEvent = { site: site.currentSite === 'n8up' ? 'scanevent' : 'n8up' };
  assert.equal(site.belongsToCurrentSite(reservation), true);
  assert.equal(site.belongsToCurrentSite(movedEvent), false);
  assert.equal(site.belongsToCurrentSite({ site: 'unknown' }), false);
});
test('checkout rejects an event assigned to the other website before reserving tickets', async () => {
  const writes = [];
  const otherSite = site.currentSite === 'n8up' ? 'scanevent' : 'n8up';
  const route = load('app/api/checkout/route.ts', {
    '@/lib/event-site': site,
    'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => null }, Timestamp: { fromMillis: n => n } },
    'node:crypto': { randomBytes: () => { throw new Error('Checkout must not be reached'); } },
    '@/lib/firebase-admin': { db: {
      collection: () => ({ doc: id => ({ id: id || 'new-reservation' }) }),
      runTransaction: callback => callback({
        get: async () => wrap({ site: otherSite, status: 'published', capacity: 10 }),
        update: (...args) => writes.push(args),
        set: (...args) => writes.push(args),
      }),
    } },
    '@/lib/env': { maxTicketsPerOrder: () => 6, reservationMinutes: () => 30 },
    '@/lib/inventory': { releaseExpiredReservations: async () => {}, releaseReservation: async () => {} },
    '@/lib/stripe': { getStripe: () => { throw new Error('Stripe must not be called'); } },
  });
  const response = await route.POST(new Request('https://example.test/api/checkout', { method: 'POST', body: JSON.stringify({ eventId: 'foreign', quantity: 1 }) }));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, 'Event not found.');
  assert.equal(writes.length, 0);
});
test('a shared Stripe webhook ignores the other website’s paid reservation', async () => {
  const otherSite = site.currentSite === 'n8up' ? 'scanevent' : 'n8up';
  const route = load('app/api/webhooks/stripe/route.ts', {
    '@/lib/event-site': site,
    'firebase-admin/firestore': {},
    '@/lib/firebase-admin': { db: { collection: () => ({ doc: () => ({ get: async () => wrap({ site: otherSite }) }) }) } },
    '@/lib/env': { requireEnv: () => 'test-only-secret' },
    '@/lib/email': { sendTicketEmail: () => { throw new Error('Wrong website must not email tickets'); } },
    '@/lib/inventory': {},
    '@/lib/token': {},
    '@/lib/stripe': { getStripe: () => ({ webhooks: { constructEvent: () => ({
      id: 'stripe-event', type: 'checkout.session.completed', data: { object: { payment_status: 'paid', metadata: { reservationId: 'other', eventId: 'event' } } },
    }) } }) },
  });
  const response = await route.POST(new Request('https://example.test/api/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': 'test-only-signature' }, body: '{}' }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true });
});
