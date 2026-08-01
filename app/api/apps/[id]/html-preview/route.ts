import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/database';
import { htmlPreviewCacheTag } from '../../html-preview/cache';

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
 * 캐싱 전략:
 *   - 앱 ID별로 unstable_cache에 HTML을 캐싱해 평소 조회는 Storage 왕복 없이 응답.
 *   - 앱 소유자가 HTML을 수정/삭제하면 업로드 라우트(app/api/apps/html-preview/route.ts)에서
 *     revalidateTag(htmlPreviewCacheTag(appId))를 호출해 해당 앱 캐시만 즉시 무효화함.
 *     → "즉시 반영" 요구사항을 지키면서도 대부분의 조회는 캐시 히트로 빠르게 응답.
 */
async function fetchHtmlFromStorage(appId: string, bucket: string): Promise<string | null> {
  const admin = getAdminClient();
  const storagePath = `html-preview/${appId}.html`;

  const { data, error } = await admin.storage.from(bucket).download(storagePath);
  if (error) {
    // "파일 없음"만 null로 캐시. 그 외 일시적 오류는 throw해서 캐시되지 않게 함
    // (Supabase Storage error에는 표준 status 코드가 없어 메시지로 구분)
    if (/not[ _]?found/i.test(error.message)) return null;
    throw error;
  }
  if (!data) return null;

  return data.text();
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: appId } = await params;

  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!bucket) {
    return new NextResponse('Storage not configured', { status: 500 });
  }

  const getCachedHtml = unstable_cache(
    () => fetchHtmlFromStorage(appId, bucket),
    ['app-html-preview', appId],
    { tags: [htmlPreviewCacheTag(appId)] }
  );

  let html: string | null;
  try {
    html = await getCachedHtml();
  } catch (err) {
    console.error('[html-preview GET] fetch error:', err);
    return new NextResponse(
      '<!DOCTYPE html><html><body><p>HTML 미리보기를 불러오는데 실패했습니다.</p></body></html>',
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  if (html == null) {
    return new NextResponse(
      '<!DOCTYPE html><html><body><p>HTML 미리보기를 찾을 수 없습니다.</p></body></html>',
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // 브라우저/CDN에는 짧게만 캐시 허용 (실제 신선도는 revalidateTag가 보장)
      'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
