import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();

  // supabase.auth.signOut() 제거 - 클라이언트에서만 호출하여 이중 호출 방지
  // 서버에서는 쿠키만 삭제

  const allCookies = cookieStore.getAll();
  for (const cookie of allCookies) {
    if (cookie.name.includes('supabase') || cookie.name.includes('sb-')) {
      cookieStore.delete(cookie.name);
    }
  }

  return NextResponse.json({ ok: true });
}
