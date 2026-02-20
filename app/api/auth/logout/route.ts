import { getServerClient } from '@/lib/database/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const supabase = await getServerClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  allCookies.forEach((cookie) => {
    if (cookie.name.startsWith('sb-') || cookie.name.includes('auth-token')) {
      cookieStore.set({
        name: cookie.name,
        value: '',
        maxAge: 0,
        path: '/',
        expires: new Date(0),
      });
    }
  });

  return NextResponse.json({ ok: true });
}
