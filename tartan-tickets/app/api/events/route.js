import { NextResponse } from 'next/server';
import store from '../../../lib/store';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userName = searchParams.get('user') || 'Guest';
  const filters = { category: searchParams.get('category') || 'all', price: searchParams.get('price') || 'all', supervision: searchParams.get('supervision') || 'all', from: searchParams.get('from') || '', to: searchParams.get('to') || '' };
  const recommendation = store.getRecommendationSummary(userName);
  const rankedEvents = store.getPersonalizedLibrary({ userName });
  const events = store.filterEvents(rankedEvents, filters).map(event => ({
    ...event,
    explanation: recommendation.active ? store.getRecommendationExplanation(userName, event.id) : '',
  }));
  for (const event of events) store.recordInteraction(userName, event.id, 'view');
  return NextResponse.json({ events, saved: store.getSaved(userName).map(e => e.id), recommendation });
}
