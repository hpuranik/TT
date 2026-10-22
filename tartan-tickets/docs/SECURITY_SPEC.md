# SECURITY_SPEC.md: CMU Events & Ticketing (iOS)

Status: DRAFT v0.2 · Date: 2026-10-20 · No code is included or implied.
Assumption tags `[A-nn]` refer to `requirements.md` §1.

## 1. Scope and approach

Four security requirements, each in EARS form, each with lettered sub-clauses. Every sub-clause is individually tested in `TEST_SPEC.md` (e.g., `SEC-02c`).

**Verification target (assumption SA-01):** OWASP ASVS **v5.0.0** (released May 2025; verified) at **Level 2**, because the app handles payments and students' personal data. The chapter-level mapping below comes from my memory of ASVS's structure; when implementing, map to exact requirement IDs in the form `v5.0.0-<chapter>.<section>.<requirement>`. Mobile controls follow OWASP MASVS v2.

## 2. Threats these requirements answer (your concern ranked first)

| # | Threat | Addressed by |
|---|---|---|
| T1 | A predator hosts events to lure attendees, then deletes or cancels the evidence | SEC-04, REQ-DATA-04/05/06/07 |
| T2 | A predator uses organizer tools to harvest attendee identities or contact info | SEC-02 |
| T3 | A fake or impersonated organizer, or a falsely "supervised" event | SEC-04(g), SEC-02(d) |
| T4 | Account takeover of an organizer to redirect payouts or alter events | SEC-01(e), SEC-03(f) |
| T5 | Payment tampering: price manipulation, forged webhooks, duplicate tickets | SEC-03 |
| T6 | Recommendation data used to profile or target individuals | SEC-02(e) |
| T7 | Bots/scalping and hold-hoarding on popular on-sales | SEC-02(f), SEC-03(e) |
| T8 | Insider or moderator abuse | SEC-02(d), SEC-04(c) |

## 3. Security requirements (EARS)

### SEC-01 Identity and sessions
**When a person authenticates, the system shall verify identity only through CMU SSO using the system browser with the Authorization Code flow and PKCE, and shall:**
- **(a)** validate the ID token's signature, issuer, audience, nonce, and expiry, and reject the sign-in if any check fails;
- **(b)** bind each account to the identity provider's immutable subject identifier rather than to an email address or Andrew ID;
- **(c)** never receive, store, or log a user password;
- **(d)** keep tokens only in the iOS Keychain, use short-lived access tokens (≤ 15 minutes, assumption SA-02) with rotating refresh tokens, and revoke the whole token family if a refresh token is reused;
- **(e)** require re-authentication within the previous 5 minutes (SA-02) before payout-destination changes, event cancellation, claim approval, and moderator actions.

*Basis:* RFC 8252 (OAuth 2.0 for Native Apps), RFC 7636 (PKCE), ASVS Authentication, Session Management, OAuth/OIDC chapters; MASVS-AUTH, MASVS-STORAGE.

### SEC-02 Authorization and data minimization
**When any request reads or writes data, the system shall authorize it on the server by role, resource ownership, and the visibility table in `requirements.md` §1.5, shall deny by default, and shall:**
- **(a)** ignore client-supplied user IDs, roles, prices, and connected-account IDs, deriving them from the session and server records;
- **(b)** return to an organizer, for that organizer's own events only, attendee display name and ticket status and nothing else;
- **(c)** limit door staff to one event and to the event window plus 2 hours, then expire the access automatically;
- **(d)** allow moderator access to personal data only through a case-linked request that is logged with actor, reason, and time, and require multi-factor authentication for moderator accounts;
- **(e)** keep interaction and personalization data pseudonymous, expose it to no one but the user, and release organizer metrics only as aggregates of 10 or more with suppression of small or differencing counts;
- **(f)** rate-limit and alert on abnormal use of attendee-list, hold-creation, and claim endpoints, including an organizer viewing attendee lists outside the event window or exporting in bulk (no export function shall exist).

*Basis:* OWASP API Security Top 10 (2023): Broken Object Level Authorization, Broken Function Level Authorization, Broken Object Property Level Authorization, Unrestricted Access to Sensitive Business Flows; ASVS Authorization and Data Protection chapters.

### SEC-03 Payment integrity
**When a ticket purchase is initiated, the system shall protect it end to end, and shall:**
- **(a)** compute amount, currency, and destination connected account on the server from the event record;
- **(b)** collect card data only through the Stripe SDK so that card data never touches our servers, logs, analytics, or database, preserving PCI SAQ A eligibility;
- **(c)** verify the Stripe webhook signature, with a timestamp tolerance, on every webhook and reject any that fail;
- **(d)** process each Stripe event exactly once by event ID and send idempotency keys on every Stripe create and refund call;
- **(e)** issue tickets only after verified payment success, in the same database transaction that decrements inventory, so a ticket never exists without both;
- **(f)** create charges only on connected accounts that currently have charges enabled, have passed claim or organizer verification, and are not suspended, and shall apply a payout delay (default 7 days, SA-02) after a payout-destination change or a new claim;
- **(g)** keep Stripe secret keys in a secrets manager as restricted keys, never in the app binary, source control, or logs;
- **(h)** reconcile internal orders to Stripe daily and alert on any mismatch.

*Basis:* Stripe documentation (webhook signatures, idempotent requests, Connect charge types, SAQ A with mobile SDKs); PCI DSS v4.0.1 SAQ A; ASVS Validation and Business Logic, API, Secure Coding chapters; MASVS-CODE. *Note:* Stripe says platform Radar rules do not apply to direct charges on connected accounts, so fraud screening on those relies on Stripe's own defaults plus our velocity limits in SEC-02(f).

### SEC-04 Event and RSVP record integrity (anti-lure)
**When an event, ticket-holder, supervision-badge, or host record is created, changed, canceled, or removed, the system shall write an append-only, tamper-evident record of the change, and shall:**
- **(a)** make hard deletion impossible through any application role or API, including organizers, moderators, and admins, so that "delete" means a status change;
- **(b)** on cancellation, removal, a time or venue or host change, or an organizer's departure, preserve the event details, edit history, host identity, and the complete RSVP/ticket-holder list with timestamps;
- **(c)** restrict sealed-record access to case-linked moderators and to legal process through admins, and log every access;
- **(d)** alert moderators when an event with sales is canceled or its venue changed within 24 hours of the start (SA-02), when the same host cancels and re-creates events repeatedly, or when an address changes after tickets sell;
- **(e)** retain sealed records for the period in A-08 and run integrity verification at least weekly;
- **(f)** periodically write an integrity digest of the log to storage that engineers with database access cannot alter, so a privileged insider's edits are detectable;
- **(g)** allow the Supervised badge to be granted, changed, or removed only by an authenticated moderator action that is itself recorded, never by the organizer.

*Basis:* tamper-evident logging research (below); ASVS Security Logging and Error Handling and Data Protection chapters. *Limit:* tamper evidence **detects** alteration; it does not prevent a determined insider with full infrastructure access, which is why (f) exists.

## 4. Assumptions specific to this document

| ID | Assumption | Risk if wrong |
|---|---|---|
| SA-01 | ASVS Level 2 is the right target. | Higher (L3) or lower (L1) effort. |
| SA-02 | Numeric defaults: 15-minute access tokens, 5-minute re-auth, 7-day payout delay, 24-hour pre-event alert window. | Tuning. |
| SA-03 | CMU's identity provider supports OIDC or SAML for third-party apps and a stable subject identifier. **Not researched.** | SEC-01 design changes. |
| SA-04 | The moderator team will actually review the SEC-04(d) alerts. | Controls become decoration. |
| SA-05 | No jailbreak detection is relied on for security; server-side checks are authoritative. | None; this is deliberate. |

## 5. What this spec does not protect against
- Harm at physical events. A badge and records deter and enable investigation; they do not guarantee safety.
- A predator who is a verified, well-behaved-looking CMU student until the day of the event. SEC-04 supports after-the-fact accountability, and REQ-DATA-05 / SEC-04(d) reduce but do not eliminate risk.
- Coercion or social-engineering of moderators beyond the logging and MFA controls above.

## 6. References and verification status

**Verified this session (opened and checked):**
- Koren, Y. (2009). *Collaborative Filtering with Temporal Dynamics.* KDD '09, pp. 447-456, DOI 10.1145/1557019.1557072. Best Research Paper at KDD-09; republished in *Communications of the ACM*, April 2010. Koren was on the team that won the Netflix Prize.
- Singh, A. & Joachims, T. (2018). *Fairness of Exposure in Rankings.* KDD '18, DOI 10.1145/3219819.3220088 (Cornell University).
- OWASP ASVS 5.0.0, released 30 May 2025 (owasp.org project page).
- Stripe docs: Checkout `expires_at` must be 30 minutes to 24 hours; Connect charge types and who is liable for refunds/disputes; SAQ A eligibility with Checkout, Elements, or mobile SDKs; ACH Direct Debit up to 4 business days with consumer disputes up to 60 days.

**From memory, not re-verified this session (check before relying):**
- Mavin, A., et al. (2009). *Easy Approach to Requirements Syntax (EARS).* RE '09.
- Schneier, B. & Kelsey, J. (1999). *Secure Audit Logs to Support Computer Forensics.* ACM TISSEC.
- Crosby, S. & Wallach, D. (2009). *Efficient Data Structures for Tamper-Evident Logging.* USENIX Security.
- Ding, Y. & Li, X. (2005). *Time Weight Collaborative Filtering.* CIKM '05 (named as prior temporal work in Koren's CACM article).
- IETF RFC 8252 and RFC 7636; OWASP MASVS v2; OWASP API Security Top 10 (2023); PCI DSS v4.0.1; ASVS chapter names.
- Apple's payment-outside-the-app rule: seen only as quoted in developer forums; I did not open Apple's own page.
