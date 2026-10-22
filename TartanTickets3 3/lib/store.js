const seed = [
  { id: 'event-1', title: 'CMU Fall Film Night', category: 'Arts', startsAt: '2026-10-24T19:00:00-04:00', venueArea: 'Cohon University Center', venueDetail: 'McConomy Auditorium', price: 0, organizerId: 'cmu-arts', organizerName: 'CMU Arts Collective', supervisionLabel: 'Org-supervised', description: 'A relaxed screening of student short films, followed by an optional conversation with the filmmakers.', refundPolicy: 'Free reservations can be canceled any time before the event. No payment is collected in this demo.', safetyResources: ['Campus Police: 412-268-2323', 'Counseling and Psychological Services (CaPS): 412-268-2922'] },
  { id: 'event-2', title: 'Three Rivers Social Run', category: 'Sports & Outdoors', startsAt: '2026-10-25T10:00:00-04:00', venueArea: 'Schenley Park', venueDetail: 'Flagstaff Hill meeting point', price: 5, organizerId: 'cmu-rec', organizerName: 'CMU Recreation Club', supervisionLabel: 'Org-supervised', description: 'An easy-paced group run with a short walking option. All experience levels welcome.', refundPolicy: 'Refund requests are accepted until 24 hours before start time. Demo only; no money is collected.', safetyResources: ['Campus Police: 412-268-2323', 'Emergency: 911'] },
  { id: 'event-3', title: 'Build a Tiny Game in an Hour', category: 'Technology', startsAt: '2026-10-27T18:30:00-04:00', venueArea: 'Tepper Quad', venueDetail: 'Tepper School, room 270', price: 8, organizerId: 'cmu-makers', organizerName: 'CMU Makers Club', supervisionLabel: 'Org-supervised', description: 'Bring your curiosity. Teams make a tiny playable game using beginner-friendly tools.', refundPolicy: 'Refund requests are accepted until 24 hours before start time. Demo only; no money is collected.', safetyResources: ['Campus Police: 412-268-2323', 'Emergency: 911'] },
  { id: 'event-4', title: 'Pumpkin Carving & Chai', category: 'Food & Drink', startsAt: '2026-10-29T17:30:00-04:00', venueArea: 'Oakland', venueDetail: 'Exact location shared after reservation', price: 4, organizerId: 'host-student', organizerName: 'Maya Patel (verified host)', supervisionLabel: 'Personal event, not supervised by an organization', description: 'A small, host-led evening for carving pumpkins, making chai, and meeting new people. Capacity is limited.', refundPolicy: 'Refund requests are accepted up to 48 hours before start time. Demo only; no money is collected.', safetyResources: ['Campus Police: 412-268-2323', 'Emergency: 911'] },
  { id: 'event-5', title: 'Open Mic: First Drafts', category: 'Arts', startsAt: '2026-11-01T20:00:00-05:00', venueArea: 'Pittsburgh — Oakland', venueDetail: 'The Edge, lower level', price: 0, organizerId: 'cmu-arts', organizerName: 'CMU Arts Collective', supervisionLabel: 'Org-supervised', description: 'Poetry, comedy, music, and works in progress. Performing is optional; listening counts.', refundPolicy: 'Free reservations can be canceled any time before the event. No payment is collected in this demo.', safetyResources: ['Campus Police: 412-268-2323', 'CaPS: 412-268-2922'] },
  { id: 'event-6', title: 'Board Games, No Experience Needed', category: 'Games', startsAt: '2026-11-03T19:00:00-05:00', venueArea: 'Shadyside', venueDetail: 'Community room; details on event page', price: 6, organizerId: 'host-student-2', organizerName: 'Jordan Lee (verified host)', supervisionLabel: 'Personal event, not supervised by an organization', description: 'A low-pressure board-game night with a few short games to help everyone get acquainted.', refundPolicy: 'Refund requests are accepted up to 48 hours before start time. Demo only; no money is collected.', safetyResources: ['Campus Police: 412-268-2323', 'Emergency: 911'] }
];
const state = globalThis.__tartanTicketsState || (globalThis.__tartanTicketsState = { events: seed.map(e => ({...e})), saved: new Map(), blocked: new Map(), reports: [], reservations: [], sessions: new Map() });
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
function resetDemoState() { state.events = seed.map(e => ({...e})); state.saved.clear(); state.blocked.clear(); state.reports = []; state.reservations = []; state.sessions.clear(); }
module.exports = { createSession, seedEvents, listEvents, filterEvents, toggleSaved, getSaved, reportEvent, blockOrganizer, simulatedPayment, resetDemoState };
