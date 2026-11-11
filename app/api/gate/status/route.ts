import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database';

export const runtime = 'nodejs';

// GET /api/gate/status?app=<앱 id>  →  { on: boolean }
// 앱의 문지기가 "지금 입장권 모드 켜져 있어?"를 물어보는 가벼운 확인용 주소.
// 열 하나(gate_mode)만 조회하고 참/거짓 한 글자만 답한다. CDN이 60초 동안 답을 기억하므로
// 학생이 몰려도 허브(DB)까지 오는 요청은 앱당 1분에 한두 번 수준이다.
// 앱을 못 찾으면 "켜짐"으로 답해서(닫는 쪽) 잘못된 설정으로 열리는 일이 없게 한다.
export async function GET(request: Request) {
  const appId = new URL(request.url).searchParams.get('app') || '';
  const headers = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' };
  if (!/^[0-9a-fA-F-]{36}$/.test(appId)) {
    return NextResponse.json({ on: true }, { headers });
  }
  const { data, error } = await getAdminClient().from('apps').select('gate_mode').eq('id', appId).maybeSingle();
  if (error) return NextResponse.json({ on: true }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  return NextResponse.json({ on: data ? data.gate_mode === true : true }, { headers });
}
