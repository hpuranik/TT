import { NextResponse } from 'next/server';
import store from '../../../lib/store';
export async function POST(request) { try { const { user, eventId } = await request.json(); const reservation = store.simulatedPayment(user, eventId); store.recordInteraction(user, eventId, 'purchase'); return NextResponse.json({ reservation }); } catch(e) { return NextResponse.json({ error: e.message }, {status:400}); } }
