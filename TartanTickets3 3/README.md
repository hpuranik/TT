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
