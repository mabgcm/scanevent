# ScanEvent

## Event site verification

Run `node --test tests/event-sites.test.mjs`. Events use `site: "scanevent" | "n8up"`; select Website in the event editor or filter the shared admin list. Events without a site remain with ScanEvent. Public listing, detail and checkout enforce site assignments. Reservations and orders keep their originating site for Stripe webhook routing. No new environment variables or indexes are needed.
