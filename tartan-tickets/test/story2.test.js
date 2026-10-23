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
  setPersonalizationEnabled,
  refundPurchase,
  getRankingFeatures,
} = require('../lib/store');

test.beforeEach(() => resetDemoState());

// REQ-S2-01
// When a user interacts with an event, the system shall record only four interaction types,
// each with a timestamp: view, click, save, purchase.
test('REQ-S2-01_records_only_four_interaction_types_with_timestamps', () => {
  const user = 'Alex';
  const event = listEvents({ userName: user })[0];
  const timestamp = new Date().toISOString();

  for (const type of ['view', 'click', 'save', 'purchase']) {
    assert.equal(recordInteraction(user, event.id, type, { at: timestamp }).at, timestamp);
  }
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
test('REQ-S2-03_halves_signal_after_configured_half_life', () => {
  const user = 'Alex';
  const [freshEvent, oldEvent] = listEvents({ userName: user });
  const freshTs = new Date().toISOString();
  const oldTs = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();

  recordInteraction(user, freshEvent.id, 'save', { at: freshTs });
  recordInteraction(user, oldEvent.id, 'save', { at: oldTs });

  const freshScore = scoreEventForUser(user, freshEvent.id);
  const oldScore = scoreEventForUser(user, oldEvent.id);
  assert.ok(Math.abs(oldScore / freshScore - 0.5) <= 0.01);
});

// REQ-S2-04
// While the decayed interaction weight is below the cold-start threshold, the system shall show the general library.
test('REQ-S2-04_below_threshold_shows_general_library', () => {
  const user = 'Alex';
  const general = getGeneralLibrary({ userName: user });
  const events = listEvents({ userName: user });

  recordInteraction(user, events[0].id, 'save', { at: new Date().toISOString() });
  recordInteraction(user, events[1].id, 'save', { at: new Date().toISOString() });
  recordInteraction(user, events[2].id, 'click', { at: new Date().toISOString() });
  recordInteraction(user, events[3].id, 'click', { at: new Date().toISOString() });

  const personalized = getPersonalizedLibrary({ userName: user });
  assert.deepEqual(personalized.map((event) => event.id), general.map((event) => event.id));
  assert.equal(getRecommendationSummary(user).active, false);

  recordInteraction(user, events[4].id, 'click', { at: new Date().toISOString() });
  assert.equal(getRecommendationSummary(user).active, true);
  assert.equal(getRecommendationSummary(user).threshold, 15);
});

// REQ-S2-05
// The system shall derive ranking features only from event attributes and shall not use profile, demographic,
// or inferred-user fields.
test('REQ-S2-05_ranking_uses_only_event_attributes', () => {
  const user = 'Alex';
  const event = listEvents({ userName: user })[0];

  assert.deepEqual(Object.keys(getRankingFeatures(event)).sort(), [
    'category', 'organizer', 'priceBand', 'timeOfDay', 'venue',
  ]);
  recordInteraction(user, event.id, 'save', { at: new Date().toISOString() });
  const explanation = getRecommendationExplanation(user, listEvents({ userName: user })[4].id);

  assert.match(explanation, /category|host|venue area|time of day|price range/i);
  assert.doesNotMatch(explanation, /profile|demographic|email|phone|age|gender|income|address/i);
});

// REQ-S2-06
// When a personalized item is shown, the system shall offer a "Why am I seeing this?" explanation
// that cites only the viewing user’s own actions.
test('REQ-S2-06_why_explanation_cites_only_own_actions', () => {
  const user = 'Alex';
  const [eventA, , eventC] = listEvents({ userName: user });

  recordInteraction(user, eventA.id, 'save', { at: new Date().toISOString() });
  recordInteraction('Sam', eventC.id, 'save', { at: new Date().toISOString() });

  const explanation = getRecommendationExplanation(user, eventA.id);
  assert.match(explanation, /saved/i);
  assert.match(explanation, new RegExp(eventA.title));
  assert.doesNotMatch(explanation, new RegExp(eventC.title));
  assert.doesNotMatch(explanation, /other users|someone else|their history|everyone else/i);
});

// REQ-S2-07
// When personalization is turned off or history is reset, the system shall stop using history on the next refresh.
test('REQ-S2-07_turn_off_or_reset_history_stops_personalization_on_next_refresh', () => {
  const user = 'Alex';
  const [eventA, eventB, eventC] = listEvents({ userName: user });

  recordInteraction(user, eventA.id, 'save', { at: new Date().toISOString() });
  recordInteraction(user, eventB.id, 'click', { at: new Date().toISOString() });
  recordInteraction(user, eventC.id, 'save', { at: new Date().toISOString() });

  setPersonalizationEnabled(user, false);
  assert.equal(getRecommendationSummary(user).active, false);
  assert.equal(getRecommendationSummary(user).interactionWeight, 0);
  recordInteraction(user, eventA.id, 'save', { at: new Date().toISOString() });
  assert.equal(getRecommendationSummary(user).interactionWeight, 0);
  assert.deepEqual(
    getPersonalizedLibrary({ userName: user }).map((event) => event.id),
    getGeneralLibrary({ userName: user }).map((event) => event.id),
  );
  setPersonalizationEnabled(user, true);
  resetPersonalizationHistory(user);
  const personalized = getPersonalizedLibrary({ userName: user });
  const general = getGeneralLibrary({ userName: user });

  assert.deepEqual(personalized.map((event) => event.id), general.map((event) => event.id));
  assert.equal(getRecommendationSummary(user).interactionWeight, 0);
});

// REQ-S2-08
// The system shall reserve at least 20% of top-ranked slots for events outside the user’s learned pattern.
test('REQ-S2-08_reserves_20_percent_of_top_slots_for_non_personalized_events', () => {
  const user = 'Alex';
  const events = listEvents({ userName: user });

  for (let i = 0; i < 3; i += 1) {
    recordInteraction(user, events[i].id, 'save', { at: new Date().toISOString() });
  }
  recordInteraction(user, events[4].id, 'click', { at: new Date().toISOString() });

  const ranked = getPersonalizedLibrary({ userName: user, limit: 10 });
  const outsidePattern = ranked.filter((event) => !event._learnedPattern);
  const interactedIds = new Set([events[0].id, events[1].id, events[2].id, events[4].id]);

  assert.ok(outsidePattern.length >= Math.ceil(ranked.length * 0.2));
  assert.ok(outsidePattern.every((event) => !interactedIds.has(event.id)));
});

// REQ-S2-09
// The system shall not let any party pay for or otherwise buy higher ranking.
test('REQ-S2-09_no_paid_or_organizer_controlled_boost_exists', () => {
  const user = 'Alex';
  const event = listEvents({ userName: user })[0];

  const ranked = getPersonalizedLibrary({ userName: user });
  const withUntrustedBoosts = getPersonalizedLibrary({
    userName: user,
    paidBoosts: { [event.id]: 1000 },
    organizerBoosts: { [event.organizerId]: 1000 },
  });
  const flagged = ranked.find((item) => item.id === event.id);

  assert.deepEqual(withUntrustedBoosts.map((item) => item.id), ranked.map((item) => item.id));
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
  const start = Date.now();

  for (let index = 0; index < 10; index += 1) {
    recordInteraction(user, event.id, 'view', { at: new Date(start + index * 60_000).toISOString() });
    recordInteraction(user, event.id, 'click', { at: new Date(start + index * 60_000).toISOString() });
  }
  assert.ok(Math.abs(scoreEventForUser(user, event.id, 'view') - 1) < 0.001);
  assert.ok(Math.abs(scoreEventForUser(user, event.id, 'click') - 2) < 0.001);

  recordInteraction(user, event.id, 'view', { at: new Date(start + 24 * 60 * 60 * 1000).toISOString() });
  recordInteraction(user, event.id, 'click', { at: new Date(start + 24 * 60 * 60 * 1000).toISOString() });
  assert.ok(scoreEventForUser(user, event.id, 'view') > 1.9);
  assert.ok(scoreEventForUser(user, event.id, 'click') > 3.9);

  recordInteraction(user, event.id, 'purchase', { at: new Date(start).toISOString() });
  assert.ok(Math.abs(scoreEventForUser(user, event.id, 'purchase') - 10) < 0.001);
  refundPurchase(user, event.id, { at: new Date(start + 1_000).toISOString() });
  assert.ok(Math.abs(scoreEventForUser(user, event.id, 'purchase') - 5) < 0.001);
});

// REQ-S2-11
// The system shall show organizer behavior-derived metrics only as aggregates with a count of at least 10.
test('REQ-S2-11_organizer_metrics_are_only_aggregate_counts_of_10_or_more', () => {
  const event = listEvents({ userName: 'Alex' }).find((item) => item.organizerId === 'host-student');
  for (let index = 0; index < 9; index += 1) {
    recordInteraction(`viewer-${index}`, event.id, 'save', { at: new Date().toISOString() });
  }
  assert.deepEqual(getOrganizerMetrics({ organizerId: 'host-student', minimumCount: 10 }), []);

  recordInteraction('viewer-9', event.id, 'save', { at: new Date().toISOString() });
  const metrics = getOrganizerMetrics({ organizerId: 'host-student', minimumCount: 10 });

  assert.ok(Array.isArray(metrics));
  assert.ok(metrics.length > 0);
  assert.ok(metrics.every((metric) => metric.count >= 10));
  assert.ok(metrics.every((metric) => !('user' in metric) && !('userId' in metric) && !('interactions' in metric)));
});

// Story 2 user flow smoke test using the actual app rules
// The user logs in, interacts, and then sees a personalized library that is not the same as the general library.
test('story2_user_flow_personalized_library_appears_after_three_interactions', () => {
  const user = 'Alex';
  createSession(user, true);
  const events = listEvents({ userName: user });

  for (const event of events.slice(0, 4)) {
    recordInteraction(user, event.id, 'save', { at: new Date().toISOString() });
  }

  const personalized = getPersonalizedLibrary({ userName: user });
  const general = getGeneralLibrary({ userName: user });

  assert.ok(personalized.length > 0);
  assert.equal(getRecommendationSummary(user).active, true);
  assert.ok(personalized.some((event) => event._recommendationScore > 0));
});
