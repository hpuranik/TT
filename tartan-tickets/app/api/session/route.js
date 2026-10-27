import { NextResponse } from 'next/server';
import store from '../../../lib/store';

export async function POST(request) {
  try {
    const body = await request.json();

    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      Object.hasOwn(body, 'password')
    ) {
      return NextResponse.json(
        { error: 'Invalid session request' },
        { status: 400 }
      );
    }

    const { name, adultAttested } = body;

    return NextResponse.json({
      session: store.createSession(name, adultAttested === true)
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
