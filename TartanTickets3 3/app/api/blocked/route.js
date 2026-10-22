import { NextResponse } from 'next/server';
import store from '../../../lib/store';
export async function POST(request) { try { const { user, organizerId } = await request.json(); store.blockOrganizer(user, organizerId); return NextResponse.json({ ok: true }); } catch(e) { return NextResponse.json({error:e.message},{status:400}); } }
