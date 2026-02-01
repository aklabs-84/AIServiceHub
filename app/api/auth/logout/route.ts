import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  // 1. Standard SignOut
  await supabase.auth.signOut();

  // 2. Force delete all Supabase-related cookies
  // Supabase cookies usually start with 'sb-' or contain the project ID
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  // Find and delete all Supabase auth cookies
  allCookies.forEach((cookie) => {
    if (cookie.name.startsWith('sb-') || cookie.name.includes('auth-token')) {
      cookieStore.set({
        name: cookie.name,
        value: '',
        maxAge: 0,
        path: '/',
        expires: new Date(0)
      });
    }
  });

  return NextResponse.json({ ok: true });
}
