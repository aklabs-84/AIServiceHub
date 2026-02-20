import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/database/server';

export async function GET() {
  const supabase = await getServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ session: null }, { status: 200 });
  }

  return NextResponse.json({
    session: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      token_type: session.token_type,
      user: session.user,
    },
  });
}
