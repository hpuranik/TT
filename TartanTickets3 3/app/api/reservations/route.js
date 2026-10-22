import { NextResponse } from 'next/server';
import store from '../../../lib/store';
export async function POST(request) { try { const { user, eventId } = await request.json(); return NextResponse.json({ reservation: store.simulatedPayment(user, eventId) }); } catch(e) { return NextResponse.json({ error: e.message }, {status:400}); } }
