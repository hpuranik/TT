const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createSession, seedEvents, listEvents, filterEvents, toggleSaved, reportEvent,
  blockOrganizer, simulatedPayment, resetDemoState
} = require('../lib/store');

test.beforeEach(() => resetDemoState());

test('signup_requires_18plus_attestation_and_refusal_blocks_account', () => {
  assert.throws(() => createSession('Alex', false), /18 or older/);
  const session = createSession('Alex', true);
  assert.equal(session.displayName, 'Alex');
  assert.ok(session.adultAttestedAt);
  assert.equal(Object.hasOwn(session, 'password'), false);
});

test('new_user_sees_unpersonalized_library_sorted_by_start_time', () => {
  const first = listEvents({ userName: 'Alex' });
  const second = listEvents({ userName: 'Sam' });
  assert.deepEqual(first.map(e => e.id), second.map(e => e.id));
  assert.deepEqual(first.map(e => e.startsAt), [...first.map(e => e.startsAt)].sort());
  assert.ok(first.length >= 4);
});

test('event_card_shows_required_fields_and_supervision_label', () => {
  const events = listEvents({});
  for (const event of events) {
    assert.ok(event.startsAt);
    assert.ok(event.venueArea);
    assert.ok(typeof event.price === 'number');
    assert.ok(['Org-supervised', 'Personal event, not supervised by an organization'].includes(event.supervisionLabel));
  }
  assert.ok(events.some(e => e.price === 0));
  assert.ok(events.some(e => e.supervisionLabel.startsWith('Personal')));
});

test('filters_return_only_matching_events', () => {
  const filtered = filterEvents(listEvents({}), { category: 'Arts', price: 'free', supervision: 'supervised' });
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every(e => e.category === 'Arts' && e.price === 0 && e.supervisionLabel === 'Org-supervised'));
});

test('save_and_unsave_event_updates_saved_list', () => {
  const event = listEvents({})[0];
  assert.equal(toggleSaved('Alex', event.id), true);
  assert.equal(toggleSaved('Alex', event.id), false);
});

test('report_hides_reporter_and_block_hides_and_prevents_purchase', () => {
  const event = listEvents({}).find(e => e.organizerId === 'host-student');
  const report = reportEvent('Alex', event.id, 'Safety concern');
  assert.equal(Object.hasOwn(report, 'reporterName'), false);
  blockOrganizer('Alex', event.organizerId);
  assert.ok(!listEvents({ userName: 'Alex' }).some(e => e.organizerId === event.organizerId));
  assert.throws(() => simulatedPayment('Alex', event.id), /blocked because you blocked this organizer/i);
});

test('simulated_payment_never_creates_a_real_payment_or_ticket', () => {
  const event = listEvents({})[0];
  const result = simulatedPayment('Alex', event.id);
  assert.equal(result.status, 'simulated');
  assert.equal(result.realPayment, false);
  assert.equal(result.ticketIssued, false);
});

test('seed_events_are_deterministic_and_no_password_or_attendee_list_is_exposed', () => {
  const events = seedEvents();
  assert.ok(events.length >= 4);
  for (const event of listEvents({})) {
    assert.equal(Object.hasOwn(event, 'attendees'), false);
    assert.equal(Object.hasOwn(event, 'reporterName'), false);
  }
});
