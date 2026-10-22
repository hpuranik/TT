# TEST_SPEC.md: CMU Events & Ticketing (iOS)

Status: DRAFT v0.2 · Date: 2026-10-20 · No code is included or implied.
Every requirement in `requirements.md` and every sub-clause in `SECURITY_SPEC.md` maps to at least one named test below. Test names are identifiers for future implementation; none exist yet.

**Levels:** UNIT, INT (integration), E2E (device/UI flow), SEC (security test), LOAD, REVIEW (manual/process check).
**Stripe tests** use Stripe test mode only; live keys are never used in tests (`SEC-03g`).

## 1. Data and visibility (`REQ-DATA`)

| Req | Test name | Level | Pass condition |
|---|---|---|---|
| REQ-DATA-01 | `visibility_matrix_returns_only_permitted_fields_per_role` | INT | For each role x data type in requirements §1.5, forbidden fields are absent and requests for them return 403. |
| REQ-DATA-02 | `no_password_card_or_bank_data_in_storage_or_logs` | SEC | Scan DB, logs, analytics, and crash reports after a full purchase flow: zero password, PAN, or bank-number matches. |
| REQ-DATA-03 | `organizer_and_staff_never_receive_attendee_contact_or_interest_fields` | SEC | Organizer and door-staff API responses never contain email, phone, Andrew ID, payment, interaction, or interest fields. |
| REQ-DATA-04 | `supervised_badge_requires_moderator_verification_and_removal_pauses_sales` | INT | Badge absent until moderator approves; Personal label shown otherwise; removing the badge pauses sales. |
| REQ-DATA-05 | `personal_event_controls_enforced` | INT | Personal event shows host's verified name, first 2 events held, address hidden pre-purchase, 51st ticket rejected. |
| REQ-DATA-06 | `event_hard_delete_is_impossible_for_every_role` | SEC | Delete via API, admin console, and direct role permissions only changes status; row and RSVP rows remain. |
| REQ-DATA-07 | `sealed_record_created_on_cancel_edit_removal_and_organizer_departure` | INT | Each trigger creates a sealed record with details, edit history, host, and full RSVP list with timestamps. |
| REQ-DATA-08 | `sealed_record_access_limited_to_case_linked_moderators_and_logged` | SEC | Organizer, attendee, and unlinked moderator get 403; linked moderator succeeds and an access log entry exists. |
| REQ-DATA-09 | `sealed_record_tamper_is_detected` | SEC | Editing or removing a record in a test DB causes the integrity check to fail and raise an alert. |
| REQ-DATA-10 | `sealed_records_survive_retention_job_until_period_ends` | INT | Retention job leaves sealed records younger than the configured period untouched. |
| REQ-DATA-11 | `account_deletion_removes_personal_data_except_sealed_identifiers` | INT | Within 30 days only the minimal sealed identifiers remain for that user. |
| REQ-DATA-12 | `pre_signup_disclosure_shows_collection_visibility_and_retention` | E2E | Sign-up cannot complete until the disclosure screen is shown and acknowledged; text covers all three topics. |

## 2. Story 1: Browsing (`REQ-S1`)

| Req | Test name | Level | Pass condition |
|---|---|---|---|
| REQ-S1-01 | `first_launch_requires_sso_and_has_no_password_field` | E2E | Only the SSO route is available; no password UI or endpoint exists. |
| REQ-S1-02 | `signup_requires_18plus_attestation_and_refusal_blocks_account` | E2E | Attestation timestamp stored; declining creates no account. |
| REQ-S1-03 | `new_user_sees_unpersonalized_library_sorted_by_start_time` | INT | Zero-history user gets events in strictly ascending start time, identical to another zero-history user's order. |
| REQ-S1-04 | `event_card_shows_required_fields_and_supervision_label` | E2E | Date, time, general area, price/Free, and label all render for org, personal, and free events. |
| REQ-S1-05 | `filters_return_only_matching_events` | INT | Every returned event satisfies all applied filters; none are missed in the seed set. |
| REQ-S1-06 | `save_and_unsave_event_updates_saved_list` | E2E | Saved list reflects add and remove immediately and after relaunch. |
| REQ-S1-07 | `event_page_shows_refund_policy_host_label_report_and_safety_resources` | E2E | All four elements are present on every event type. |
| REQ-S1-08 | `report_hides_reporter_and_block_hides_and_prevents_purchase` | INT | Organizer view lacks reporter identity; blocked organizer's events absent and purchase attempt rejected. |
| REQ-S1-09 | `app_requests_no_location_contacts_or_photos_permissions` | REVIEW | Info.plist/entitlements contain no such usage strings; no permission prompt appears in any flow. |
| REQ-S1-10 | `no_attendee_visibility_or_messaging_surface_exists` | SEC | No API or UI returns other attendees' identities or counts-by-name; no messaging/follow endpoints exist. |

## 3. Story 2: Recommendations (`REQ-S2`)

| Req | Test name | Level | Pass condition |
|---|---|---|---|
| REQ-S2-01 | `only_four_interaction_types_are_recorded_with_timestamps` | INT | Any other event type is rejected; each of the four stores a timestamp. |
| REQ-S2-02 | `signal_weights_order_purchase_save_click_view` | UNIT | With equal age, score(purchase) > score(save) > score(click) > score(view). |
| REQ-S2-03 | `recency_decay_halves_signal_at_half_life` | UNIT | A signal aged one half-life scores 50% (+/-1%) of a fresh one. |
| REQ-S2-04 | `below_threshold_user_gets_general_library` | INT | Weight 14 returns the REQ-S1-03 order; weight 15 enables personalization. |
| REQ-S2-05 | `ranking_uses_only_event_attributes` | REVIEW | Feature list in code and model config contains no profile, demographic, or inferred-user fields; test fails if one is added. |
| REQ-S2-06 | `why_explanation_cites_only_own_actions` | INT | Explanation text references only the viewer's own saved/bought/clicked events. |
| REQ-S2-07 | `opt_out_and_reset_stop_personalization_and_delete_history` | INT | Next refresh returns the general library; history removed within the deletion window. |
| REQ-S2-08 | `top_n_reserves_20_percent_non_personalized_slots` | UNIT | In any top-N (N >= 10), at least 20% are outside the learned pattern. |
| REQ-S2-09 | `no_paid_or_organizer_controlled_boost_exists` | SEC | No API field, admin setting, or code path lets any role alter rank by payment or request. |
| REQ-S2-10 | `repeat_views_clicks_capped_and_refund_downgrades_purchase_signal` | UNIT | 10 views in 24h count once; refunded purchase scores as save. |
| REQ-S2-11 | `organizer_metrics_only_as_aggregates_of_10_or_more` | INT | Counts below 10 are suppressed; no per-user rows are returned. |

## 4. Story 3: Buying (`REQ-S3`)

| Req | Test name | Level | Pass condition |
|---|---|---|---|
| REQ-S3-01 | `checkout_hold_10_minutes_one_per_event_max_4_tickets` | INT | Countdown starts at 10:00; second hold on same event is refused; 5th ticket refused. |
| REQ-S3-02 | `total_and_refund_policy_shown_and_price_change_forces_reconfirm` | E2E | Total and policy visible pre-confirm; changing price mid-checkout blocks payment until reconfirmed. |
| REQ-S3-03 | `payment_only_via_stripe_sdk_and_no_ach_offered` | E2E | Apple Pay and card are offered; no bank-account option exists; no card field is rendered by our own views. |
| REQ-S3-04 | `payment_created_on_connected_account_with_server_amount` | INT | Stripe test-mode PaymentIntent has the organizer's account and the amount from the event record, even if the client sends a different amount. |
| REQ-S3-05 | `ticket_issued_once_after_verified_success_even_with_duplicate_or_reordered_webhooks` | INT | Replaying and reordering webhooks yields exactly one order and tickets; no ticket before success. |
| REQ-S3-06 | `failed_canceled_or_expired_payment_issues_no_ticket_and_releases_hold` | INT | Inventory returns to its prior count; no ticket exists. |
| REQ-S3-07 | `no_oversell_under_1200_concurrent_checkouts_with_p95_under_1s` | LOAD | Tickets issued never exceed capacity; hold-creation p95 < 1 s. |
| REQ-S3-08 | `receipt_order_history_and_non_transferable_account_bound_ticket` | E2E | Receipt and history appear; transfer/gift attempts fail; ticket opens only on the buyer's account. |
| REQ-S3-09 | `qr_rotates_and_scan_returns_correct_state_single_admit_with_lookup_fallback` | E2E | Old QR shows expired; second scan shows already-used; scan p95 < 2 s; name lookup works only inside the event window. |
| REQ-S3-10 | `self_service_refund_within_policy_window_restores_inventory` | INT | Refund appears on the connected account; inventory +1; outside the window the request is declined. |
| REQ-S3-11 | `event_cancel_or_removal_refunds_all_orders_automatically` | INT | Every non-refunded order shows a refund and status to the attendee. |
| REQ-S3-12 | `free_event_reservation_skips_stripe_and_obeys_limits` | INT | No Stripe call is made; capacity, 4-ticket limit, and safety rules still apply. |
| REQ-S3-13 | `stripe_outage_shows_error_and_issues_no_ticket` | INT | With Stripe stubbed down, no order is confirmed and the user sees an error. |
| REQ-S3-14 | `dispute_webhook_marks_ticket_disputed_notifies_and_blocks_scan` | INT | Ticket scan returns invalid; organizer and moderators are notified. |

## 5. Carried-over requirements (`REQ-X`)

| Req | Test name | Level | Pass condition |
|---|---|---|---|
| REQ-X-01 | `unclaimed_listing_is_labeled_unverified_with_no_purchase_path` | E2E | Label and source link shown; purchase button absent; "Notify me" present. |
| REQ-X-02 | `claim_requires_proof_of_control_and_charges_enabled_before_sales` | INT | Sales stay disabled until both pass; competing claims land in the moderator queue. |
| REQ-X-03 | `payout_details_never_populated_from_web_sources` | SEC | No ingestion path writes any payout field; only Stripe onboarding webhooks can set connected-account links. |
| REQ-X-04 | `contested_claim_pauses_sales_and_routes_to_moderator` | INT | Sales paused within one request; moderator queue item created. |
| REQ-X-05 | `ingestion_respects_robots_stores_facts_and_holds_private_residences` | INT | Disallowed source yields no fetch; stored fields exclude copied text/images; a residential address is held, not published. |

## 6. Security requirements (`SEC`)

| Req | Test name | Level | Pass condition |
|---|---|---|---|
| SEC-01 (all) | `sso_auth_code_pkce_via_system_browser_only` | SEC | No embedded web view or implicit flow; PKCE verifier required. |
| SEC-01a | `id_token_validation_rejects_bad_signature_issuer_audience_nonce_expiry` | SEC | Each tampered token is rejected and no session is created. |
| SEC-01b | `account_bound_to_idp_subject_not_email` | INT | Changing email/Andrew ID claim does not link a different account; same subject maps to the same account. |
| SEC-01c | `no_password_received_stored_or_logged` | SEC | Same scan as REQ-DATA-02 over auth flows. |
| SEC-01d | `tokens_in_keychain_short_lived_and_refresh_reuse_revokes_family` | SEC | No token in UserDefaults/files/backups; replaying an old refresh token revokes all descendants. |
| SEC-01e | `sensitive_actions_require_reauth_within_5_minutes` | INT | Payout change, cancellation, claim approval, and moderator actions fail with a stale session and pass after fresh re-auth. |
| SEC-02a | `client_supplied_ids_roles_prices_accounts_are_ignored` | SEC | Tampered request bodies/headers have no effect on authorization or pricing. |
| SEC-02b | `organizer_sees_only_name_and_status_for_own_events` | SEC | Another organizer's event ID returns 403; own event returns only those two fields. |
| SEC-02c | `door_staff_access_scoped_to_one_event_and_expires` | INT | Access fails for other events and after window + 2 hours. |
| SEC-02d | `moderator_access_is_case_linked_logged_and_mfa_protected` | SEC | No case = denied; allowed access writes a log entry; login without MFA is refused. |
| SEC-02e | `personalization_data_pseudonymous_and_aggregates_suppress_small_and_differencing_counts` | SEC | No organizer or moderator query returns per-user interactions; counts < 10 and diff-derivable counts are suppressed. |
| SEC-02f | `abnormal_attendee_list_hold_and_claim_activity_is_rate_limited_and_alerted` | SEC | Burst and off-window attendee-list access trigger limits and an alert; no export endpoint exists. |
| SEC-03a | `server_computes_amount_currency_destination` | SEC | Same assertion as REQ-S3-04 under adversarial client input. |
| SEC-03b | `card_data_never_reaches_servers_logs_or_analytics` | SEC | Traffic capture and log scan show no card data; only Stripe-SDK traffic carries it. |
| SEC-03c | `webhook_signature_and_timestamp_verified` | SEC | Unsigned, wrongly signed, and stale-timestamp webhooks are rejected with no side effects. |
| SEC-03d | `webhook_events_processed_once_and_stripe_calls_use_idempotency_keys` | INT | Duplicate event ID is a no-op; retried create/refund calls do not double-charge or double-refund. |
| SEC-03e | `ticket_and_inventory_change_commit_atomically` | INT | Injected failure between steps leaves neither a ticket nor a decrement. |
| SEC-03f | `charges_only_on_enabled_verified_unsuspended_accounts_and_payout_delay_applied` | INT | Disabled/suspended/unverified accounts cannot be charged; payout-destination change triggers the 7-day delay. |
| SEC-03g | `stripe_secrets_not_in_binary_repo_or_logs_and_keys_are_restricted` | SEC | Secret scan of binary, repo history, and logs is clean; key permissions match the allowlist. |
| SEC-03h | `daily_reconciliation_alerts_on_mismatch` | INT | Seeded mismatch raises an alert within the next run. |
| SEC-04 (all) | `every_change_to_event_rsvp_badge_host_writes_append_only_record` | INT | Each mutation adds a new hash-linked entry; existing entries are never updated. |
| SEC-04a | `no_role_can_hard_delete_events_or_rsvps` | SEC | Same assertion as REQ-DATA-06, including admin and DB-role permission checks. |
| SEC-04b | `sealed_record_preserves_details_history_host_and_full_rsvp_list` | INT | Same assertion as REQ-DATA-07. |
| SEC-04c | `sealed_access_limited_and_logged` | SEC | Same assertion as REQ-DATA-08. |
| SEC-04d | `risky_cancel_recreate_and_address_change_patterns_alert_moderators` | INT | Cancel within 24h of start, repeated cancel/recreate, and post-sale address change each raise an alert. |
| SEC-04e | `weekly_integrity_verification_runs_and_retention_enforced` | INT | Job runs on schedule; failed verification pages on-call; retention matches A-08. |
| SEC-04f | `external_integrity_digest_detects_privileged_tampering` | SEC | Altering the log with DB-admin rights is detected by comparing against the external digest. |
| SEC-04g | `only_moderator_actions_change_supervision_badge_and_changes_are_recorded` | SEC | Organizer attempts fail; moderator change creates an audit entry. |

## 7. Release gates (process, not code)
- All tests above pass; LOAD test run against production-sized data before launch.
- Independent penetration test covering SEC-01 through SEC-04 and the organizer, door-staff, and moderator roles.
- REVIEW items signed off: permissions manifest, ranking feature list, Apple payment/deletion rules, counsel review of A-08.
- Moderation staffing and on-call named (A-15). **If this is not true, do not launch.**
