const seed = [
  { id: 'event-1', title: 'CMU Fall Film Night', category: 'Arts', startsAt: '2026-10-24T19:00:00-04:00', venueArea: 'Cohon University Center', venueDetail: 'McConomy Auditorium', price: 0, organizerId: 'cmu-arts', organizerName: 'CMU Arts Collective', supervisionLabel: 'Org-supervised', description: 'A relaxed screening of student short films, followed by an optional conversation with the filmmakers.', refundPolicy: 'Free reservations can be canceled any time before the event. No payment is collected in this demo.', safetyResources: ['Campus Police: 412-268-2323', 'Counseling and Psychological Services (CaPS): 412-268-2922'] },
  { id: 'event-2', title: 'Three Rivers Social Run', category: 'Sports & Outdoors', startsAt: '2026-10-25T10:00:00-04:00', venueArea: 'Schenley Park', venueDetail: 'Flagstaff Hill meeting point', price: 5, organizerId: 'cmu-rec', organizerName: 'CMU Recreation Club', supervisionLabel: 'Org-supervised', description: 'An easy-paced group run with a short walking option. All experience levels welcome.', refundPolicy: 'Refund requests are accepted until 24 hours before start time. Demo only; no money is collected.', safetyResources: ['Campus Police: 412-268-2323', 'Emergency: 911'] },
  { id: 'event-3', title: 'Build a Tiny Game in an Hour', category: 'Technology', startsAt: '2026-10-27T18:30:00-04:00', venueArea: 'Tepper Quad', venueDetail: 'Tepper School, room 270', price: 8, organizerId: 'cmu-makers', organizerName: 'CMU Makers Club', supervisionLabel: 'Org-supervised', description: 'Bring your curiosity. Teams make a tiny playable game using beginner-friendly tools.', refundPolicy: 'Refund requests are accepted until 24 hours before start time. Demo only; no money is collected.', safetyResources: ['Campus Police: 412-268-2323', 'Emergency: 911'] },
  { id: 'event-4', title: 'Pumpkin Carving & Chai', category: 'Food & Drink', startsAt: '2026-10-29T17:30:00-04:00', venueArea: 'Oakland', venueDetail: 'Exact location shared after reservation', price: 4, organizerId: 'host-student', organizerName: 'Maya Patel (verified host)', supervisionLabel: 'Personal event, not supervised by an organization', description: 'A small, host-led evening for carving pumpkins, making chai, and meeting new people. Capacity is limited.', refundPolicy: 'Refund requests are accepted up to 48 hours before start time. Demo only; no money is collected.', safetyResources: ['Campus Police: 412-268-2323', 'Emergency: 911'] },
  { id: 'event-5', title: 'Open Mic: First Drafts', category: 'Arts', startsAt: '2026-11-01T20:00:00-05:00', venueArea: 'Pittsburgh — Oakland', venueDetail: 'The Edge, lower level', price: 0, organizerId: 'cmu-arts', organizerName: 'CMU Arts Collective', supervisionLabel: 'Org-supervised', description: 'Poetry, comedy, music, and works in progress. Performing is optional; listening counts.', refundPolicy: 'Free reservations can be canceled any time before the event. No payment is collected in this demo.', safetyResources: ['Campus Police: 412-268-2323', 'CaPS: 412-268-2922'] },
  { id: 'event-6', title: 'Board Games, No Experience Needed', category: 'Games', startsAt: '2026-11-03T19:00:00-05:00', venueArea: 'Shadyside', venueDetail: 'Community room; details on event page', price: 6, organizerId: 'host-student-2', organizerName: 'Jordan Lee (verified host)', supervisionLabel: 'Personal event, not supervised by an organization', description: 'A low-pressure board-game night with a few short games to help everyone get acquainted.', refundPolicy: 'Refund requests are accepted up to 48 hours before start time. Demo only; no money is collected.', safetyResources: ['Campus Police: 412-268-2323', 'Emergency: 911'] }
];
const state = globalThis.__tartanTicketsState || (globalThis.__tartanTicketsState = { events: seed.map(e => ({...e})), saved: new Map(), blocked: new Map(), reports: [], reservations: [], sessions: new Map(), interactions: new Map(), personalization: new Map() });
state.interactions ||= new Map();
state.personalization ||= new Map();
function userKey(name) { return String(name || 'Guest').trim().toLowerCase() || 'guest'; }
function seedEvents() { return state.events.map(e => ({...e})); }
function createSession(name, isAdult) { const clean = String(name || '').trim(); if (!clean) throw new Error('Enter a display name'); if (isAdult !== true) throw new Error('You must confirm you are 18 or older'); const session = { displayName: clean.slice(0, 50), adultAttestedAt: new Date().toISOString() }; state.sessions.set(userKey(clean), session); return { ...session }; }
function listEvents({ userName } = {}) {
  const blocked = state.blocked.get(userKey(userName)) || new Set();
  return state.events.filter(e => new Date(e.startsAt).getTime() >= Date.now() && !blocked.has(e.organizerId)).slice().sort((a,b) => a.startsAt.localeCompare(b.startsAt)).map(e => ({...e}));
}
function filterEvents(events, filters = {}) {
  const now = Date.now();
  return events.filter(e => {
    if (filters.category && filters.category !== 'all' && e.category !== filters.category) return false;
    if (filters.price === 'free' && e.price !== 0) return false;
    if (filters.price === 'paid' && e.price === 0) return false;
    if (filters.supervision === 'supervised' && e.supervisionLabel !== 'Org-supervised') return false;
    if (filters.supervision === 'personal' && !e.supervisionLabel.startsWith('Personal')) return false;
    if (filters.from && new Date(e.startsAt) < new Date(`${filters.from}T00:00:00`)) return false;
    if (filters.to && new Date(e.startsAt) > new Date(`${filters.to}T23:59:59`)) return false;
    return new Date(e.startsAt).getTime() >= now;
  }).sort((a,b) => a.startsAt.localeCompare(b.startsAt));
}
function toggleSaved(name, id) {
  if (!state.events.some(e => e.id === id)) throw new Error('Event not found');
  const key = userKey(name); const set = state.saved.get(key) || new Set();
  const saved = !set.has(id); saved ? set.add(id) : set.delete(id); state.saved.set(key, set); return saved;
}
function getSaved(name) { const set = state.saved.get(userKey(name)) || new Set(); return [...set].map(id => state.events.find(e => e.id === id)).filter(Boolean).map(e => ({...e})); }
function reportEvent(name, id, reason) {
  if (!state.events.some(e => e.id === id)) throw new Error('Event not found');
  const record = { id: `report-${state.reports.length+1}`, eventId: id, reason: String(reason || 'Other').slice(0,500), createdAt: new Date().toISOString(), status: 'received' };
  state.reports.push(record); return {...record};
}
function blockOrganizer(name, organizerId) { const key = userKey(name); const set = state.blocked.get(key) || new Set(); set.add(organizerId); state.blocked.set(key,set); return true; }
function simulatedPayment(name, id) {
  const event = state.events.find(e => e.id === id); if (!event) throw new Error('Event not found');
  const blocked = state.blocked.get(userKey(name)) || new Set(); if (blocked.has(event.organizerId)) throw new Error('Purchase blocked because you blocked this organizer');
  const record = { id: `demo-${state.reservations.length+1}`, eventId:id, buyer:userKey(name), status:'simulated', realPayment:false, ticketIssued:false, createdAt:new Date().toISOString() };
  state.reservations.push(record); return {...record};
}
const INTERACTION_WEIGHTS = { view: 1, click: 2, save: 5, purchase: 10 };
const RECENCY_HALF_LIFE_MS = 30 * 24 * 60 * 60 * 1000;
const PERSONALIZATION_THRESHOLD = 15;
const INTERACTION_WINDOW_MS = 24 * 60 * 60 * 1000;

function interactionKey(name, eventId) { return `${userKey(name)}:${eventId}`; }
function interactionHistory(name) {
  const prefix = `${userKey(name)}:`;
  return [...state.interactions.entries()]
    .filter(([key]) => key.startsWith(prefix))
    .flatMap(([, entries]) => entries);
}
function effectiveWeight(interaction) {
  return interaction.type === 'purchase' && interaction.refunded
    ? INTERACTION_WEIGHTS.save
    : INTERACTION_WEIGHTS[interaction.type];
}
function decayedWeight(interaction, now = Date.now()) {
  const age = Math.max(0, now - Date.parse(interaction.at));
  return effectiveWeight(interaction) * (2 ** (-age / RECENCY_HALF_LIFE_MS));
}
function recordInteraction(name, eventId, type, options = {}) {
  if (!Object.hasOwn(INTERACTION_WEIGHTS, type)) throw new Error('Unsupported interaction type');
  if (!state.events.some(event => event.id === eventId)) throw new Error('Event not found');
  const at = new Date(options.at ?? Date.now());
  if (!Number.isFinite(at.getTime())) throw new Error('Invalid interaction timestamp');
  const timestamp = at.toISOString();
  if (state.personalization.get(userKey(name)) === false) {
    return { user: userKey(name), eventId, type, at: timestamp, accepted: false };
  }
  const key = interactionKey(name, eventId);
  const entries = state.interactions.get(key) || [];
  if (type === 'view' || type === 'click') {
    const hasRecentSignal = entries.some(entry =>
      entry.type === type && Math.abs(at.getTime() - Date.parse(entry.at)) < INTERACTION_WINDOW_MS,
    );
    if (hasRecentSignal) return { ...entries.find(entry => entry.type === type && Math.abs(at.getTime() - Date.parse(entry.at)) < INTERACTION_WINDOW_MS), accepted: false };
  }
  const interaction = { user: userKey(name), eventId, type, at: timestamp };
  entries.push(interaction);
  state.interactions.set(key, entries);
  return { ...interaction, accepted: true };
}
function scoreEventForUser(name, eventId, type) {
  const entries = state.interactions.get(interactionKey(name, eventId)) || [];
  return entries
    .filter(interaction => !type || interaction.type === type)
    .reduce((total, interaction) => total + decayedWeight(interaction), 0);
}
function refundPurchase(name, eventId, options = {}) {
  const entries = state.interactions.get(interactionKey(name, eventId)) || [];
  const purchase = [...entries].reverse().find(interaction => interaction.type === 'purchase' && !interaction.refunded);
  if (!purchase) throw new Error('Purchase interaction not found');
  const refundedAt = new Date(options.at ?? Date.now());
  if (!Number.isFinite(refundedAt.getTime())) throw new Error('Invalid refund timestamp');
  purchase.refunded = true;
  purchase.refundedAt = refundedAt.toISOString();
  return { ...purchase };
}
function getGeneralLibrary({ userName, limit } = {}) {
  const events = listEvents({ userName });
  return Number.isFinite(limit) ? events.slice(0, Math.max(0, limit)) : events;
}
function getRecommendationSummary(name) {
  const enabled = state.personalization.get(userKey(name)) !== false;
  const interactionWeight = interactionHistory(name).reduce((total, interaction) => total + decayedWeight(interaction), 0);
  return {
    enabled,
    active: enabled && interactionWeight >= PERSONALIZATION_THRESHOLD,
    interactionWeight,
    threshold: PERSONALIZATION_THRESHOLD,
  };
}
function getRankingFeatures(event) {
  const hour = new Date(event.startsAt).getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
  const priceBand = event.price === 0 ? 'free' : event.price < 10 ? 'under-10' : '10-or-more';
  return {
    category: event.category,
    organizer: event.organizerId,
    venue: event.venueArea,
    timeOfDay,
    priceBand,
  };
}
function getPersonalizedLibrary({ userName, limit, paidBoosts, organizerBoosts } = {}) {
  const events = getGeneralLibrary({ userName });
  const summary = getRecommendationSummary(userName);
  if (!summary.active) return Number.isFinite(limit) ? events.slice(0, Math.max(0, limit)) : events;

  const featureWeights = new Map();
  for (const interaction of interactionHistory(userName)) {
    const event = state.events.find(candidate => candidate.id === interaction.eventId);
    if (!event) continue;
    const weight = decayedWeight(interaction);
    for (const [feature, value] of Object.entries(getRankingFeatures(event))) {
      const key = `${feature}:${value}`;
      featureWeights.set(key, (featureWeights.get(key) || 0) + weight);
    }
  }
  const ranked = events.map(event => {
    const features = getRankingFeatures(event);
    const relevance = Object.entries(features).reduce((total, [feature, value]) => total + (featureWeights.get(`${feature}:${value}`) || 0), 0);
    const learnedPattern = ['category', 'organizer'].some(feature => featureWeights.has(`${feature}:${features[feature]}`));
    return { ...event, _learnedPattern: learnedPattern, _recommendationScore: relevance };
  }).sort((left, right) => right._recommendationScore - left._recommendationScore || left.startsAt.localeCompare(right.startsAt));
  const resultCount = Math.min(ranked.length, Number.isFinite(limit) ? Math.max(0, limit) : ranked.length);
  const explorationSlots = Math.ceil(resultCount * 0.2);
  const exploration = ranked.filter(event => !event._learnedPattern).slice(0, explorationSlots);
  const learned = ranked.filter(event => event._learnedPattern).slice(0, resultCount - exploration.length);
  const selected = [...learned, ...exploration];
  const selectedIds = new Set(selected.map(event => event.id));
  const remaining = ranked.filter(event => !selectedIds.has(event.id)).slice(0, resultCount - selected.length);
  return [...selected, ...remaining];
}
function getRecommendationExplanation(name, eventId) {
  const event = state.events.find(candidate => candidate.id === eventId);
  if (!event) return '';
  const features = getRankingFeatures(event);
  const examples = interactionHistory(name)
    .map(interaction => ({ interaction, event: state.events.find(candidate => candidate.id === interaction.eventId) }))
    .filter(item => item.event)
    .map(item => ({ ...item, weight: decayedWeight(item.interaction) }))
    .filter(item => Object.entries(getRankingFeatures(item.event)).some(([feature, value]) => features[feature] === value))
    .sort((left, right) => right.weight - left.weight);
  if (!examples.length) return 'This event is part of your general library.';
  const example = examples[0];
  const action = example.interaction.type === 'purchase' ? 'bought' : `${example.interaction.type}d`;
  const sharedFeature = Object.entries(getRankingFeatures(example.event)).find(([feature, value]) => features[feature] === value)?.[0];
  const featureLabel = { category: 'category', organizer: 'host', venue: 'venue area', timeOfDay: 'time of day', priceBand: 'price range' }[sharedFeature];
  return `Because you ${action} “${example.event.title},” and this event shares its ${featureLabel}.`;
}
function setPersonalizationEnabled(name, enabled) {
  const key = userKey(name);
  state.personalization.set(key, enabled === true);
  if (enabled !== true) resetPersonalizationHistory(name);
  return getRecommendationSummary(name);
}
function resetPersonalizationHistory(name) {
  const prefix = `${userKey(name)}:`;
  for (const key of state.interactions.keys()) if (key.startsWith(prefix)) state.interactions.delete(key);
  return getRecommendationSummary(name);
}
function getOrganizerMetrics({ organizerId, minimumCount = 10 } = {}) {
  const audience = new Map();
  for (const [key, entries] of state.interactions) {
    const eventId = entries[0]?.eventId;
    const event = state.events.find(candidate => candidate.id === eventId);
    if (!event || event.organizerId !== organizerId) continue;
    const users = audience.get(organizerId) || new Set();
    for (const entry of entries) users.add(entry.user);
    audience.set(organizerId, users);
  }
  const count = audience.get(organizerId)?.size || 0;
  return count >= Math.max(10, minimumCount) ? [{ organizerId, count }] : [];
}
function resetDemoState() { state.events = seed.map(e => ({...e})); state.saved.clear(); state.blocked.clear(); state.reports = []; state.reservations = []; state.sessions.clear(); state.interactions.clear(); state.personalization.clear(); }
module.exports = { createSession, seedEvents, listEvents, filterEvents, toggleSaved, getSaved, reportEvent, blockOrganizer, simulatedPayment, resetDemoState, recordInteraction, scoreEventForUser, refundPurchase, getGeneralLibrary, getPersonalizedLibrary, getRecommendationExplanation, getRecommendationSummary, resetPersonalizationHistory, setPersonalizationEnabled, getOrganizerMetrics, getRankingFeatures };
