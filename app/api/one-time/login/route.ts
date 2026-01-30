
import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const hashValue = (value: string) =>
  createHash('sha256').update(value).digest('hex');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body || {};
    if (!username || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const { data: credentials, error } = await supabaseAdmin
      .from('one_time_access')
      .select('*')
      .eq('username', username)
      .limit(1)
      .maybeSingle(); // or .single() if unique constraint exists

    if (error) {
      console.error('DB error', error);
      return NextResponse.json({ error: 'DB Error' }, { status: 500 });
    }

    if (!credentials) {
      return NextResponse.json({ error: 'No active credentials' }, { status: 404 });
    }

    if (credentials.used_at) {
      return NextResponse.json({ error: 'Credentials already used' }, { status: 410 });
    }

    // Check password
    const isValid = credentials.username === username && credentials.password_hash === hashValue(password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const durationHours = Number(credentials.duration_hours || 0);
    if (!durationHours) {
      return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
    }

    const sessionToken = randomBytes(16).toString('hex');
    const sessionExpiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    await supabaseAdmin
      .from('one_time_access')
      .update({
        used_at: new Date().toISOString(),
        session_token: sessionToken,
        session_expires_at: sessionExpiresAt.toISOString(),
      })
      .eq('id', credentials.id);

    return NextResponse.json({
      token: sessionToken,
      expiresAt: sessionExpiresAt.toISOString(),
    });
  } catch (error) {
    console.error('One-time login error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
