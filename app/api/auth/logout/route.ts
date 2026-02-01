import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createSupabaseServerClient();

  // 서버 사이드에서 Supabase signOut 호출
  // 정확한 쿠키 옵션으로 삭제 헤더를 설정해 줌
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
