import { NextResponse } from 'next/server';
import store from '../../../lib/store';

export async function POST(request) {
  try {
    const { user, action, eventId, type, enabled } = await request.json();
    if (action === 'reset') {
      return NextResponse.json({ recommendation: store.resetPersonalizationHistory(user) });
    }
    if (action === 'personalization') {
      return NextResponse.json({ recommendation: store.setPersonalizationEnabled(user, enabled) });
    }
    if (action === 'refund') {
      return NextResponse.json({ interaction: store.refundPurchase(user, eventId) });
    }
    return NextResponse.json({ interaction: store.recordInteraction(user, eventId, type) });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}