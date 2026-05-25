import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database';
import { purchases } from '@/lib/database/purchases';

export const runtime = 'nodejs';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'mosebb@gmail.com';

/**
 * GET /api/prompts/[id]/content
 *
 * 유료 프롬프트의 본문 내용을 서버에서 안전하게 반환.
 * - 무료 프롬프트: content 바로 반환 (인증 필요)
 * - 유료 프롬프트: 구매/구독 확인 후 반환, 미인증은 preview만 반환
 *
 * 미리보기 전략: min(content.length * 30%, 100자)
 * → 어떤 길이의 프롬프트든 최소 70% 이상 숨겨짐
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 토큰 추출
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '').trim();

  const admin = getAdminClient();

  // 프롬프트 조회 (관리자 클라이언트로 RLS 우회)
  const { data: promptData, error: promptError } = await admin
    .from('prompts')
    .select('id, prompt_content, is_paid, price, is_public')
    .eq('id', id)
    .maybeSingle();

  if (promptError || !promptData) {
    return NextResponse.json({ error: '프롬프트를 찾을 수 없습니다.' }, { status: 404 });
  }

  const content: string = promptData.prompt_content || '';
  const isPaid: boolean = promptData.is_paid ?? false;
  const price: number = promptData.price ?? 0;

  // 무료 프롬프트: 로그인만 확인
  if (!isPaid || price === 0) {
    if (!token) {
      // 비로그인: 미리보기만
      const previewLen = Math.min(Math.floor(content.length * 0.3), 100);
      return NextResponse.json({
        locked: true,
        reason: 'unauthenticated',
        preview: content.slice(0, previewLen),
        price: 0,
      });
    }
    // 로그인 상태면 전체 공개 (무료)
    return NextResponse.json({ locked: false, content });
  }

  // ── 유료 프롬프트 ──────────────────────────────────────────────────────────
  if (!token) {
    // 비로그인: preview만 반환
    const previewLen = Math.min(Math.floor(content.length * 0.3), 100);
    return NextResponse.json({
      locked: true,
      reason: 'unauthenticated',
      preview: content.slice(0, previewLen),
      price,
    });
  }

  // 토큰으로 사용자 확인
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) {
    const previewLen = Math.min(Math.floor(content.length * 0.3), 100);
    return NextResponse.json({
      locked: true,
      reason: 'unauthenticated',
      preview: content.slice(0, previewLen),
      price,
    });
  }

  // 관리자: 무조건 허용
  if (user.email === ADMIN_EMAIL) {
    return NextResponse.json({ locked: false, content });
  }

  // 구매 or 구독 여부 확인
  const canAccess = await purchases.canAccess(admin, user.id, 'prompt', id);

  if (canAccess) {
    return NextResponse.json({ locked: false, content });
  }

  // 구매하지 않은 유료 콘텐츠: preview만 반환
  const previewLen = Math.min(Math.floor(content.length * 0.3), 100);
  return NextResponse.json({
    locked: true,
    reason: 'not_purchased',
    preview: content.slice(0, previewLen),
    price,
  });
}
