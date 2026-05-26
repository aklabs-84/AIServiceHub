import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database';

export const runtime = 'nodejs';

/**
 * GET /api/apps/[id]/html-preview
 *
 * Supabase Storage에서 HTML 파일을 가져와 text/html 헤더로 서빙.
 *
 * 왜 프록시가 필요한가:
 *   - Supabase Storage signed URL은 Content-Disposition: attachment를 붙여
 *     브라우저가 HTML을 렌더링하지 않고 코드를 그대로 표시함.
 *
 * 왜 캐시를 금지하는가:
 *   - 앱 소유자가 HTML을 수정했을 때 즉시 반영되어야 함.
 *   - Cache-Control: no-store → 브라우저/Vercel CDN 캐시 모두 차단.
 *
 * 업스트림 캐시 우회:
 *   - download() 대신 매번 새 short-lived signed URL(60초)을 생성 후 fetch.
 *   - URL에 타임스탬프 쿼리 파라미터를 붙여 Supabase/Cloudflare CDN도 우회.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: appId } = await params;

  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!bucket) {
    return new NextResponse('Storage not configured', { status: 500 });
  }

  const storagePath = `html-preview/${appId}.html`;
  const admin = getAdminClient();

  // 60초짜리 단기 signed URL 생성 → CDN 캐시 우회용
  const { data: signed, error: signError } = await admin.storage
    .from(bucket)
    .createSignedUrl(storagePath, 60);

  if (signError || !signed?.signedUrl) {
    return new NextResponse(
      '<!DOCTYPE html><html><body><p>HTML 미리보기를 찾을 수 없습니다.</p></body></html>',
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // 타임스탬프 쿼리 파라미터로 CDN 캐시도 강제 우회
  const bustUrl = `${signed.signedUrl}&_t=${Date.now()}`;

  let html: string;
  try {
    const res = await fetch(bustUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Storage fetch failed: ${res.status}`);
    html = await res.text();
  } catch (err) {
    console.error('[html-preview GET] fetch error:', err);
    return new NextResponse(
      '<!DOCTYPE html><html><body><p>HTML 미리보기를 불러오는데 실패했습니다.</p></body></html>',
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // 브라우저·Vercel CDN 캐시 모두 차단
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
