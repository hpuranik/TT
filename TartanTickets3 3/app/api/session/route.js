import { NextResponse } from 'next/server';
import store from '../../../lib/store';
export async function POST(request) {
  try {
    const { name, adultAttested } = await request.json();
    return NextResponse.json({ session: store.createSession(name, adultAttested === true) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
