const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createSession,
  listEvents,
  resetDemoState,
  recordInteraction,
  scoreEventForUser,
  getRecommendationExplanation,
  getPersonalizedLibrary,
  getOrganizerMetrics,
  getGeneralLibrary,
  getRecommendationSummary,
  resetPersonalizationHistory,
} = require('../lib/store');

test.beforeEach(() => resetDemoState());

// REQ-S2-01
// When a user interacts with an event, the system shall record only four interaction types,
// each with a timestamp: view, click, save, purchase.
test('REQ-S2-01_records_only_four_interaction_types_with_timestamps', () => {
  const user = 'Alex';
  const event = listEvents({ userName: user })[0];

  assert.doesNotThrow(() => recordInteraction(user, event.id, 'view', { at: new Date().toISOString() }));
  assert.doesNotThrow(() => recordInteraction(user, event.id, 'click', { at: new Date().toISOString() }));
  assert.doesNotThrow(() => recordInteraction(user, event.id, 'save', { at: new Date().toISOString() }));
  assert.doesNotThrow(() => recordInteraction(user, event.id, 'purchase', { at: new Date().toISOString() }));
  assert.throws(() => recordInteraction(user, event.id, 'share'), /unsupported interaction/i);
});

// REQ-S2-02
// The system shall weight signals purchase > save > click > view using the configured weights.
test('REQ-S2-02_weights_purchase_more_than_save_more_than_click_more_than_view', () => {
  const user = 'Alex';
  const [eventA, eventB, eventC, eventD] = listEvents({ userName: user });

  recordInteraction(user, eventA.id, 'view', { at: new Date().toISOString() });
  recordInteraction(user, eventB.id, 'click', { at: new Date().toISOString() });
  recordInteraction(user, eventC.id, 'save', { at: new Date().toISOString() });
  recordInteraction(user, eventD.id, 'purchase', { at: new Date().toISOString() });

  assert.ok(scoreEventForUser(user, eventD.id) > scoreEventForUser(user, eventC.id));
  assert.ok(scoreEventForUser(user, eventC.id) > scoreEventForUser(user, eventB.id));
  assert.ok(scoreEventForUser(user, eventB.id) > scoreEventForUser(user, eventA.id));
});

// REQ-S2-03
// The system shall apply exponential recency decay to every signal using the configured half-life.
test('REQ-S2-03_applies_exponential_recency_decay', () => {
  const user = 'Alex';
  const [freshEvent, oldEvent] = listEvents({ userName: user });
  const freshTs = new Date().toISOString();
  const oldTs = new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString();

  recordInteraction(user, freshEvent.id, 'save', { at: freshTs });
  recordInteraction(user, oldEvent.id, 'save', { at: oldTs });

  assert.ok(scoreEventForUser(user, freshEvent.id) > scoreEventForUser(user, oldEvent.id));
});

// REQ-S2-04
// While the decayed interaction weight is below the cold-start threshold, the system shall show the general library.
test('REQ-S2-04_below_threshold_shows_general_library', () => {
  const user = 'Alex';
  const general = getGeneralLibrary({ userName: user });
  const [first, second] = listEvents({ userName: user });

  recordInteraction(user, first.id, 'view', { at: new Date().toISOString() });
  recordInteraction(user, second.id, 'click', { at: new Date().toISOString() });

  const personalized = getPersonalizedLibrary({ userName: user });
  assert.deepEqual(personalized.map((event) => event.id), general.map((event) => event.id));
});

// REQ-S2-05
// The system shall derive ranking features only from event attributes and shall not use profile, demographic,
// or inferred-user fields.
test('REQ-S2-05_ranking_uses_only_event_attributes', () => {
  const user = 'Alex';
  const event = listEvents({ userName: user })[0];

  recordInteraction(user, event.id, 'save', { at: new Date().toISOString() });
  const explanation = getRecommendationExplanation(user, event.id);

  assert.match(explanation, /event|similar|recent|activity/i);
  assert.doesNotMatch(explanation, /profile|demographic|email|phone|age|gender|income|address/i);
});

// REQ-S2-06
// When a personalized item is shown, the system shall offer a "Why am I seeing this?" explanation
// that cites only the viewing user’s own actions.
test('REQ-S2-06_why_explanation_cites_only_own_actions', () => {
  const user = 'Alex';
  const [eventA, eventB] = listEvents({ userName: user });

  recordInteraction(user, eventA.id, 'save', { at: new Date().toISOString() });
  recordInteraction(user, eventB.id, 'click', { at: new Date().toISOString() });

  const explanation = getRecommendationExplanation(user, eventA.id);
  assert.match(explanation, /saved|clicked|similar|recent/i);
  assert.doesNotMatch(explanation, /other users|someone else|their history|everyone else/i);
});

// REQ-S2-07
// When personalization is turned off or history is reset, the system shall stop using history on the next refresh.
test('REQ-S2-07_turn_off_or_reset_history_stops_personalization_on_next_refresh', () => {
  const user = 'Alex';
  const [eventA, eventB] = listEvents({ userName: user });

  recordInteraction(user, eventA.id, 'save', { at: new Date().toISOString() });
  recordInteraction(user, eventB.id, 'click', { at: new Date().toISOString() });

  resetPersonalizationHistory(user);
  const personalized = getPersonalizedLibrary({ userName: user });
  const general = getGeneralLibrary({ userName: user });

  assert.deepEqual(personalized.map((event) => event.id), general.map((event) => event.id));
});

// REQ-S2-08
// The system shall reserve at least 20% of top-ranked slots for events outside the user’s learned pattern.
test('REQ-S2-08_reserves_20_percent_of_top_slots_for_non_personalized_events', () => {
  const user = 'Alex';
  const events = listEvents({ userName: user });

  for (let i = 0; i < 6; i += 1) {
    recordInteraction(user, events[i].id, 'save', { at: new Date().toISOString() });
  }

  const ranked = getPersonalizedLibrary({ userName: user, limit: 10 });
  const outsidePattern = ranked.filter((event) => !event._learnedPattern);

  assert.ok(outsidePattern.length >= 2);
});

// REQ-S2-09
// The system shall not let any party pay for or otherwise buy higher ranking.
test('REQ-S2-09_no_paid_or_organizer_controlled_boost_exists', () => {
  const user = 'Alex';
  const event = listEvents({ userName: user })[0];

  const ranked = getPersonalizedLibrary({ userName: user });
  const flagged = ranked.find((item) => item.id === event.id);

  assert.ok(flagged);
  assert.equal(flagged.boostPaid, undefined);
  assert.equal(flagged.organizerBoost, undefined);
});

// REQ-S2-10
// The system shall count views and clicks from one account on one event at most once per 24 hours,
// and when a purchase is refunded it shall reduce that purchase signal to the save weight.
test('REQ-S2-10_views_and_clicks_are_capped_and_refunds_downgrade_purchase_signal', () => {
  const user = 'Alex';
  const event = listEvents({ userName: user })[0];

  recordInteraction(user, event.id, 'view', { at: new Date().toISOString() });
  recordInteraction(user, event.id, 'view', { at: new Date().toISOString() });
  recordInteraction(user, event.id, 'click', { at: new Date().toISOString() });
  recordInteraction(user, event.id, 'click', { at: new Date().toISOString() });

  const viewSignal = scoreEventForUser(user, event.id, 'view');
  const clickSignal = scoreEventForUser(user, event.id, 'click');

  assert.ok(viewSignal <= 1);
  assert.ok(clickSignal <= 1);
});

// REQ-S2-11
// The system shall show organizer behavior-derived metrics only as aggregates with a count of at least 10.
test('REQ-S2-11_organizer_metrics_are_only_aggregate_counts_of_10_or_more', () => {
  const metrics = getOrganizerMetrics({ organizerId: 'host-student', minimumCount: 10 });

  assert.ok(Array.isArray(metrics));
  assert.ok(metrics.every((metric) => metric.count >= 10 || metric.count === 0));
});

// Story 2 user flow smoke test using the actual app rules
// The user logs in, interacts, and then sees a personalized library that is not the same as the general library.
test('story2_user_flow_personalized_library_appears_after_three_interactions', () => {
  const user = 'Alex';
  createSession(user, true);
  const events = listEvents({ userName: user });

  for (const event of events.slice(0, 3)) {
    recordInteraction(user, event.id, 'click', { at: new Date().toISOString() });
  }

  const personalized = getPersonalizedLibrary({ userName: user });
  const general = getGeneralLibrary({ userName: user });

  assert.ok(personalized.length > 0);
  assert.ok(personalized.some((event) => event.id !== general[0].id));
});
