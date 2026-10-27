# TartanTickets — Story 1 prototype

A web prototype of the first user story in `docs/requirements.md`: a new student enters a display name, attests that they are 18+, and browses a general, time-sorted event library.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm test
npm run build
npm run dev
```

Open http://localhost:3000. Enter a display name, check the 18+ attestation, then click **Explore events**.

## What works

- General event library sorted by start time, with date, time, general area, price, and supervision label.
- Filters for category, price/free, event type, and date range.
- Save and unsave events; switch between Discover and Saved.
- Event details include host, venue area, refund policy, safety resources, and Report action.
- Report submissions do not return the reporter's name to the client-facing report object.
- Blocking an organizer hides their events and prevents the simulated-payment action.
- A **Simulated payment** button demonstrates the checkout action without contacting a payment processor, charging money, or issuing a ticket.
- No passwords, SSO provider, location/contacts/photo permissions, attendee lists, messaging, or follow features.

## Deliberate prototype limits

- The server uses process-memory state only; restart the server and demo state resets. It is not a production database and is not durable across multiple server instances.
- The display name is a demo identity, not verified CMU identity. The 18+ attestation is recorded in memory, not independently age-verified.
- Seed events are illustrative demo content, not verified real listings. Update dates as needed when using the prototype later.
- Reports are stored in memory but are not routed to a staffed moderation operation.
- Simulated payment does not reserve inventory, create a real order, or issue a ticket.
- This implements Story 1's browsing flow only; recommendation ranking and production ticket purchasing are not implemented.

## Security spec audit

This assessment is based on application code only; deployment, hosting, repository history, logs, and operations were not inspected. Local input validation, response allowlists, basic rate limiting, and alert rules can be prototyped without external services, while trusted identity/roles, durable records, Stripe controls, and staffed operations require capabilities this demo lacks.

| Requirement | Assessment | Evidence and implementation boundary |
|---|---|---|
| SEC-01 Identity and sessions | Not satisfied | `/api/session` accepts a display name and age attestation instead of authenticating through CMU SSO. |
| SEC-01(a) ID-token validation | Not satisfied | There is no OIDC/SAML flow or ID-token validation code. |
| SEC-01(b) Immutable subject binding | Not satisfied | Store keys use a normalized client-supplied display name rather than an identity-provider subject. |
| SEC-01(c) No password handling | Partly satisfied | The UI has no password field, and the session API rejects request bodies containing a password field. Other endpoints and deployment logging have not been comprehensively verified. |
| SEC-01(d) Keychain and token lifecycle | Not satisfied | The web app has no native iOS target, Keychain, access tokens, or refresh-token lifecycle. |
| SEC-01(e) Recent re-authentication | Not satisfied | No sensitive-action re-authentication or five-minute session-freshness check exists. |
| SEC-02 Authorization and data minimization | Not satisfied | Routes accept caller-supplied identifiers without an authenticated principal, role checks, or default-deny authorization. |
| SEC-02(a) Ignore client IDs and prices | Not satisfied | Routes trust client-supplied `user`, `eventId`, and `organizerId` values instead of deriving identity and ownership from a session. |
| SEC-02(b) Organizer attendee view | Partly satisfied | No attendee-list endpoint returns attendee data, but there is also no organizer authentication or ownership-scoped view. |
| SEC-02(c) Door-staff event scope and expiry | Not satisfied | No door-staff role, event-scoped credential, or check-in endpoint exists. |
| SEC-02(d) Case-linked moderator access and MFA | Not satisfied | Reports are stored in memory, but the app has no moderator role, case linkage, access log, or MFA. |
| SEC-02(e) Pseudonymous interactions and aggregate metrics | Partly satisfied | Store metrics suppress counts below 10, but interaction keys use display names and API access is selected by a caller-supplied name. |
| SEC-02(f) Rate limits, alerts, and no export | Partly satisfied | No list/hold/claim/export endpoint exists, but existing routes have no rate limits or abnormal-use alerts. |
| SEC-03 Payment integrity | Not satisfied | Reservations are simulated and issue neither a real payment nor a ticket. |
| SEC-03(a) Server-computed amount, currency, and destination | Not satisfied | No charge, currency, amount, or connected-account destination is created. |
| SEC-03(b) Stripe SDK card collection | Partly satisfied | The app has no card fields or card-data handling, but it also has no Stripe SDK payment flow. |
| SEC-03(c) Webhook signature and timestamp | Not satisfied | There is no Stripe webhook endpoint or signature verification. |
| SEC-03(d) Webhook deduplication and idempotency | Not satisfied | No webhook handling, durable event-ID deduplication, or Stripe idempotency calls exist. |
| SEC-03(e) Atomic payment, inventory, and ticket issuance | Partly satisfied | Simulated reservations set `ticketIssued: false`, but there is no transactional inventory or payment-backed ticket issuance. |
| SEC-03(f) Verified connected accounts and payout delay | Not satisfied | The code has no connected-account, organizer verification, suspension, or payout workflow. |
| SEC-03(g) Restricted Stripe secrets | Partly satisfied | No Stripe secret is used by application code, but secret storage and deployment configuration are outside this audit. |
| SEC-03(h) Daily reconciliation | Not satisfied | There are no real orders, reconciliation job, or mismatch alerts. |
| SEC-04 Event and RSVP record integrity | Not satisfied | Events are mutable seed data in process memory with no edit workflow, RSVP ledger, or audit log. |
| SEC-04(a) Prevent hard deletion | Partly satisfied | No event-delete route exists, but the reset helper and process restart erase demo state and there is no status-based cancellation flow. |
| SEC-04(b) Preserve sealed event and RSVP history | Not satisfied | No event mutation, RSVP/ticket-holder history, or sealed record exists. |
| SEC-04(c) Restrict and log sealed-record access | Not satisfied | The code has no sealed records, case-linked roles, or access logs. |
| SEC-04(d) Risk-pattern alerts | Not satisfied | There is no event mutation or alert workflow, although basic rule detection could be added locally. |
| SEC-04(e) Retention and weekly integrity checks | Not satisfied | Process state disappears on restart and no retention policy or scheduled integrity check exists. |
| SEC-04(f) Independent integrity digest | Not satisfied | No append-only log or independent digest storage exists. |
| SEC-04(g) Moderator-only supervision changes | Partly satisfied | Supervision labels are static seed data with no organizer edit route, but there is also no authenticated moderator action or audit trail. |
