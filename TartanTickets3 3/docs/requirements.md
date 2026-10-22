# requirements.md: CMU Events & Ticketing (iOS)

Status: DRAFT v0.2 · Date: 2026-10-20 · No code is included or implied.
Companions: `SECURITY_SPEC.md`, `TEST_SPEC.md`, `NON_GOALS.md`

**What changed from v0.1:** restructured to your three user stories, added §1.5 (data stored and who sees it), and moved auto-generated/claimed events to a short "carried-over" section because they are not in your three stories.

## 0. Reading guide

EARS patterns (Mavin et al., RE'09): *Ubiquitous* "The system shall…"; *Event-driven* "When <trigger>, the system shall…"; *State-driven* "While <state>, …"; *Unwanted behavior* "If <condition>, then the system shall…"; *Optional* "Where <feature>, …".

IDs: `REQ-DATA-nn`, `REQ-S1-nn`, `REQ-S2-nn`, `REQ-S3-nn`, `REQ-X-nn`. Each maps to a named test in `TEST_SPEC.md`.
`[A-nn]` = an assumption **you did not state**; see §1.

---

## 1. Assumptions and decisions (please confirm or correct)

| ID | Assumption | Why | If wrong |
|---|---|---|---|
| A-01 | Sign-in is **CMU SSO only**; the app **never creates, stores, or sees passwords**. | You said passwords must stay private; SSO makes "no passwords" achievable. Alumni/guests/non-CMU are excluded. | Own passwords would add credential-storage, reset, and breach risk. |
| A-02 | 18+ is enforced by **self-attestation**. | SSO gives no date of birth. | Under-18 students could still register; Stripe Identity or another age check would be needed. |
| A-03 | **"Registry" is interpreted as Stripe-held payment methods (Apple Pay / saved card).** **Bank-account (ACH) payments are NOT offered in v1.** | Stripe documents ACH Direct Debit as a delayed-notification method taking up to 4 business days to confirm, with consumer disputes allowed up to 60 days and final. That conflicts with a 10-minute hold and instant tickets. | If "registry" means something else, S3 changes. If you want bank pay, tickets must wait days or you accept return risk. |
| A-04 | **Direct charges** on the organizer's Stripe connected account: the organizer is merchant of record and bears Stripe fees, refunds, disputes. Platform fee = $0. | You said money goes to the host. Stripe docs: direct charges make the connected account liable; destination charges / separate charges-and-transfers make the **platform** liable. | Platform fees or backstopping refunds changes the charge model. |
| A-05 | Checkout uses **Stripe iOS PaymentSheet + Apple Pay**, not hosted Checkout. | Checkout Sessions cannot expire sooner than 30 minutes (verified), too long for a 10-minute hold. | With hosted Checkout the hold must be ≥ 30 min. |
| A-06 | Tickets use external payment (not In-App Purchase) because they admit people to physical events. **Review risk:** developers report App Review challenging ticketing apps; guideline numbering differs by version (3.1.3(e) vs 3.1.5(a)). I did not open Apple's primary page. **Not legal advice; verify before submission.** | Apple's "goods and services consumed outside the app" rule. | Rejection or forced IAP. |
| A-07 | **Two event classes:** "Org-supervised" and "Personal." The Supervised badge is granted only by a moderator after verifying the supervising org against an admin-configured registry. **Personal events are allowed but labeled and get extra controls** (REQ-DATA-05). | You described "personal party or org event" badges, so I assumed personal events are allowed. v0.1 banned private residences; I reversed that. **This is the highest-risk decision in the spec.** | Safer alternative: ban Personal events in v1. |
| A-08 | Event and RSVP records are kept in a **sealed safety record for 7 years** minimum. Account deletion removes personal data **except** minimal identifiers (name, SSO subject ID) in sealed records. | Your lure/abuse concern. 7 years is my placeholder; legal limitation periods vary. **Needs counsel review.** This **conflicts** with a pure "delete my data" promise, so it must be disclosed (REQ-DATA-12) and I have not verified that Apple accepts this basis for retention. | Wrong period or basis = legal and App Review exposure. |
| A-09 | Tickets are non-transferable reservations tied to the buyer; max 4 per account per event. | Transfer/resale is a scalping and targeting vector. | Group flows need redesign. |
| A-10 | Check-in uses an in-app QR that rotates every ≤ 60 s, scanned by door staff; manual name lookup is the fallback; scanning needs connectivity. | "Reserves their place" needs enforcement. | Poor-Wi-Fi venues need offline mode. |
| A-11 | Initial weights purchase 10 / save 5 / click 2 / view 1; recency half-life 30 days; personalization starts at decayed weight ≥ 15; ≥ 20% of top slots reserved for non-personalized events. | You gave ordering and recency, not numbers. | Tuning. |
| A-12 | Raw interaction events kept 180 days; personal data deletion completes within 30 days. | No retention was given. | Compliance. |
| A-13 | App is independent of CMU. I did **not** research CMU's SSO onboarding or third-party policies. | You said independent. | CMU could block SSO or the name use. **Possible launch blocker.** |
| A-14 | iOS only; 12,000 users; peak 1,200 concurrent checkouts on a popular on-sale (my guess). US/USD only; 99.5% availability target. | Scale given, peak guessed. | Load targets. |
| A-15 | A moderation team exists: normal reports reviewed in 24 h, safety reports triaged in 4 h. **No operator is identified.** | Not stated. | **Launch blocker:** unstaffed safety design is hollow. |
| A-16 | Hold = 10 min; new organizers' first 2 events need moderator approval; Personal-event capacity cap 50. | Defaults. | Tuning. |
| A-17 | Your earlier answer about auto-generated events and claiming is carried over (§5), not expanded. | It is not among your three stories. | Tell me if it should be a full story. |

---

## 1.5 Data stored and who sees it

Principle: **only stakeholders see data, and only the fields they need.** (Data minimization; ASVS v5.0.0 Data Protection chapter.)

| Data | Stored by us? | Who can see it, and what |
|---|---|---|
| CMU identity (name, Andrew ID, SSO subject ID) | Yes | Self; moderators (case-linked, logged). Organizers see **display name only**. |
| Passwords | **Never** (SSO) | Nobody. |
| Card / bank numbers | **Never** (Stripe only) | Stripe only. We hold Stripe customer ID and last 4 / brand at most. |
| 18+ attestation | Yes | Moderators only. |
| Orders and tickets | Yes | Buyer; organizer (name + ticket status for own event); door staff (event window only). |
| Saved events and interactions (view/click/save/purchase) | Yes, pseudonymous | Self only. Organizers get aggregates with count ≥ 10. |
| Personalization weights | Yes, event-level | Self (as "why this" explanations). Nobody else. |
| Event record and edit history | Yes | Public fields per event page; full history to moderators. |
| RSVP / ticket-holder list | Yes, **sealed copy retained** | Organizer sees own event's names/status. Sealed record: moderators (case-linked) and legal process only. |
| Organizer verified legal identity | Yes | Moderators; host's verified name is shown on Personal events (REQ-DATA-05). |
| Reports | Yes | Moderators. Reporter identity hidden from organizer. |
| Moderator actions, access logs | Yes, append-only | Admins and auditors. |

### Data requirements

- **REQ-DATA-01** When any role requests data, the system shall return only the fields the §1.5 table permits for that role and shall deny all others.
- **REQ-DATA-02** The system shall not receive, store, or log any user password, card number, or bank-account number.
- **REQ-DATA-03** The system shall never show an organizer or door staff member any attendee's email, phone number, Andrew ID, payment details, interaction history, or interest data.
- **REQ-DATA-04** When an organizer creates an event, the system shall require a classification of Org-supervised or Personal, shall show the Supervised badge only after a moderator verifies the supervising organization, and shall show "Personal event, not supervised by an organization" otherwise. If a classification is later found false, then the system shall remove the badge and pause sales. [A-07]
- **REQ-DATA-05** While an event is classified Personal, the system shall show the host's verified name on the event page, hold the host's first 2 events for moderator approval, reveal the precise address only to ticket holders, and cap capacity at 50. [A-07, A-16]
- **REQ-DATA-06** The system shall not hard-delete an event or its RSVP/ticket-holder records through any user role or API; a delete or cancel request shall set the status to Canceled or Removed.
- **REQ-DATA-07** When an event is canceled, removed, edited (time, venue, host), or its organizer leaves or deletes their account, the system shall preserve a sealed record of the event details, edit history, host identity, and the full RSVP/ticket-holder list with timestamps.
- **REQ-DATA-08** The system shall allow access to sealed records only to case-linked moderators and to legal process via admins, and shall log every access.
- **REQ-DATA-09** The system shall make sealed records append-only and tamper-evident, so any alteration is detectable.
- **REQ-DATA-10** The system shall retain sealed records for at least the retention period in A-08. [A-08]
- **REQ-DATA-11** When a user deletes their account, the system shall delete their personal data within 30 days except the minimal identifiers held in sealed records. [A-08, A-12]
- **REQ-DATA-12** The system shall disclose, before sign-up completes, what is collected, who sees it, and that event and RSVP records are retained after cancellation or account deletion.

---

## 2. Story 1: New student browses the general library

*As a student who wants to be more socially active, I get a new app and see a general library of what's coming up.*

- **REQ-S1-01** When a person opens the app for the first time, the system shall require sign-in through CMU SSO and shall not ask for or create a password. [A-01]
- **REQ-S1-02** When an account is created, the system shall require an affirmative 18+ attestation and record it; if the person does not attest, then the system shall not create the account. [A-02]
- **REQ-S1-03** While a user has no interaction history, the system shall show a general library of upcoming events sorted by start time ascending, with no personalization.
- **REQ-S1-04** The system shall show on each event card the date, time, general venue area, price or Free, and the supervision label from REQ-DATA-04.
- **REQ-S1-05** When the user applies filters (date range, category, price/free, supervised/personal), the system shall return only matching events.
- **REQ-S1-06** When the user taps Save, the system shall add the event to their saved list and allow removal.
- **REQ-S1-07** The system shall show on every event page the refund policy, the organizer or host label, a Report action, and safety resources configured by admins. [A-15]
- **REQ-S1-08** When a user reports an event or organizer, the system shall hide the reporter's identity from the organizer; and when a user blocks an organizer, the system shall hide that organizer's events and prevent purchase from them.
- **REQ-S1-09** The system shall not request device location, contacts, or photo-library permissions in v1.
- **REQ-S1-10** The system shall not show any attendee who else is going to an event and shall provide no user-to-user messaging or follow features. [Your safety concern; see NON_GOALS]

---

## 3. Story 2: The algorithm learns what a student likes

*As a student who has been to enough events, I get events ranked by what I tend to like, the way YouTube recommends videos.*

Design note: a YouTube-style loop can narrow what a person sees. Koren (KDD'09) shows recent behavior should matter but that *discarding* old data loses signal, so exponential decay is a deliberately simple v1 baseline. Singh & Joachims (KDD'18) formalize "exposure" fairness in rankings, which motivates REQ-S2-08.

- **REQ-S2-01** The system shall record only four interaction types per user and event, each with a timestamp: view, click, save, purchase.
- **REQ-S2-02** The system shall weight signals purchase > save > click > view using the configured weights. [A-11]
- **REQ-S2-03** The system shall apply exponential recency decay to every signal using the configured half-life. [A-11]
- **REQ-S2-04** While a user's decayed interaction weight is below the cold-start threshold, the system shall show the general library per REQ-S1-03. [A-11]
- **REQ-S2-05** The system shall derive ranking features only from event attributes (category, organizer, venue, time of day, price band) and shall not use profile, demographic, or inferred identity attributes.
- **REQ-S2-06** When a personalized item is shown, the system shall offer a "Why am I seeing this?" explanation that cites only the viewing user's own actions.
- **REQ-S2-07** When a user turns off personalization or resets history, the system shall stop using their history for ranking on the next refresh and delete it per REQ-DATA-11 timing.
- **REQ-S2-08** The system shall reserve at least 20% of top-ranked slots for events outside the user's learned pattern, including new events and newer organizers. [A-11]
- **REQ-S2-09** The system shall not let any party pay for or otherwise buy higher ranking.
- **REQ-S2-10** The system shall count views and clicks from one account on one event at most once per 24 hours, and when a purchase is refunded shall reduce that purchase signal to the save weight.
- **REQ-S2-11** The system shall show organizers behavior-derived metrics only as aggregates with a count of at least 10 and never per-user detail.

---

## 4. Story 3: Buying a ticket through Stripe

*As a student, I buy a ticket to an event in my library and pay through my connected payment method.* [A-03]

- **REQ-S3-01** When a student starts checkout, the system shall hold the requested quantity for 10 minutes with a visible countdown, allow one active hold per event and at most 4 tickets per account per event. [A-09, A-16]
- **REQ-S3-02** The system shall show the total and the refund policy before confirmation, and if the price changes between selection and confirmation, shall require re-confirmation.
- **REQ-S3-03** The system shall collect payment only through the Stripe SDK (Apple Pay or saved card) and shall not offer bank-account (ACH) payment in v1. [A-03, A-05]
- **REQ-S3-04** When a paid purchase begins, the system shall create the payment on the organizer's connected Stripe account with an amount the server computes from the event record. [A-04]
- **REQ-S3-05** The system shall issue a ticket only after a verified server-side payment-succeeded confirmation from Stripe and shall produce exactly one order and set of tickets even if the confirmation arrives more than once or out of order.
- **REQ-S3-06** If payment fails, is canceled, or the hold expires, then the system shall issue no ticket and release the held quantity.
- **REQ-S3-07** The system shall never issue more tickets than capacity, including with 1,200 concurrent checkouts on one event, and shall create holds with p95 latency under 1 second. [A-14]
- **REQ-S3-08** The system shall show a receipt and order history for each purchase and shall bind each ticket to the buyer's account, non-transferable. [A-09]
- **REQ-S3-09** While a ticket is displayed, the system shall show a QR code rotating at least every 60 seconds, and when door staff scan it shall return valid, invalid, expired, or already-used within 2 seconds at p95, admit each ticket once, and offer name lookup as a fallback during the event window only. [A-10]
- **REQ-S3-10** When an attendee requests a refund within the stored refund-policy window, the system shall refund on the organizer's connected account and return the quantity to inventory.
- **REQ-S3-11** When an event is canceled or removed, the system shall refund all non-refunded orders automatically and show refund status to attendees.
- **REQ-S3-12** Where an event is free, the system shall create a $0 reservation without calling Stripe, under the same capacity, limit, and safety rules.
- **REQ-S3-13** If Stripe is unavailable, then the system shall show a clear error and issue no ticket without payment confirmation.
- **REQ-S3-14** When Stripe reports a dispute on an order, the system shall mark the ticket disputed, notify the organizer and moderators, and block its use.

---

## 5. Carried over from your earlier answers (not in the three stories) [A-17]

- **REQ-X-01** While an auto-generated event is unclaimed, the system shall label it "Unverified listing," show its source link, offer no ticket purchase, and offer "Notify me if the organizer joins."
- **REQ-X-02** When a CMU-verified user claims a listing, the system shall verify proof of control (a code sent to an address on the source's own domain, officer confirmation in an admin-configured registry, or moderator review) and shall enable ticket sales only after verification **and** the claimant's Stripe account has charges enabled. Competing claims go to a moderator.
- **REQ-X-03** The system shall take payout details only from the claimant's own Stripe onboarding and never from web sources.
- **REQ-X-04** When a verified source owner or moderator contests an approved claim, the system shall pause new sales and route the dispute to a moderator.
- **REQ-X-05** The system shall compile listings only from sources that allow automated access, store facts plus a link rather than copied content, and hold for moderator review any listing whose venue looks like a private residence or cannot be classified.

---

## 6. Open items that block launch
1. Who runs moderation and on-call? (A-15)
2. Will CMU allow SSO and use of its name? (A-13)
3. Counsel review of retention, the sealed-record basis, and Apple's payment/deletion rules. (A-06, A-08)
4. Are Personal events allowed in v1 at all? (A-07)
5. What did you mean by "registry"? (A-03)
