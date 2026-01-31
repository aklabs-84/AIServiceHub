import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function POST() {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut();

  // Supabase 관련 쿠키 명시적 삭제
  const allCookies = cookieStore.getAll();
  for (const cookie of allCookies) {
    if (cookie.name.includes('supabase') || cookie.name.includes('sb-')) {
      cookieStore.delete(cookie.name);
    }
  }

  return NextResponse.json({ ok: true });
}
