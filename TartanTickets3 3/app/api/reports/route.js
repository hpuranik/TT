import { NextResponse } from 'next/server';
import store from '../../../lib/store';
export async function POST(request) { try { const { user, eventId, reason } = await request.json(); const report = store.reportEvent(user, eventId, reason); return NextResponse.json({ report: { id: report.id, eventId: report.eventId, status: report.status, createdAt: report.createdAt } }); } catch(e) { return NextResponse.json({ error: e.message }, {status:400}); } }
