import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database';

export const runtime = 'nodejs';

/**
 * GET /api/apps/[id]/html-preview
 *
 * Supabase Storage에서 HTML 파일을 가져와 text/html로 서빙.
 * Supabase signed URL은 Content-Disposition: attachment로 서빙되어
 * 브라우저가 코드를 그대로 표시하는 문제를 이 프록시로 해결.
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

  const { data, error } = await admin.storage
    .from(bucket)
    .download(storagePath);

  if (error || !data) {
    return new NextResponse(
      '<!DOCTYPE html><html><body><p>HTML 미리보기를 찾을 수 없습니다.</p></body></html>',
      {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }

  const html = await data.text();

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // 캐시 1시간 (HTML 파일이 자주 바뀌지 않으므로)
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
