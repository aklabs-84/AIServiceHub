
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body || {};
    if (!token) {
      return NextResponse.json({ active: false });
    }

    const { data, error } = await supabaseAdmin
      .from('one_time_access')
      .select('session_expires_at')
      .eq('session_token', token)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ active: false });
    }

    const expiresAt = data.session_expires_at ? new Date(data.session_expires_at) : null;
    if (!expiresAt || expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ active: false });
    }

    return NextResponse.json({ active: true, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    console.error('One-time validate error:', error);
    return NextResponse.json({ active: false });
  }
}
