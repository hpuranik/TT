import { NextResponse } from 'next/server';
import store from '../../../lib/store';
export const dynamic = 'force-dynamic';
export async function GET(request) { const user = new URL(request.url).searchParams.get('user') || 'Guest'; return NextResponse.json({ events: store.getSaved(user) }); }
export async function POST(request) { try { const { user, eventId } = await request.json(); const saved = store.toggleSaved(user, eventId); if (saved) store.recordInteraction(user, eventId, 'save'); return NextResponse.json({ saved, events: store.getSaved(user) }); } catch (e) { return NextResponse.json({ error: e.message }, { status: 400 }); } }
