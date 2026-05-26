import { NextRequest, NextResponse } from 'next/server';
import { extractNotionPageId, notionPageToMarkdown, getNotionPageTitle } from '@/lib/notion';

export const runtime = 'nodejs';

// ── 서버 인메모리 캐시 (10분) ───────────────────────────────────
const cache = new Map<string, { md: string; title: string; cachedAt: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10분

/**
 * GET /api/notion/page?url={notionUrl}
 *
 * Notion 페이지 URL을 받아 Markdown 내용을 반환.
 * 인메모리 캐시(10분)로 반복 요청 시 API 재호출 방지.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'url 파라미터가 필요합니다.' }, { status: 400 });
  }

  const pageId = extractNotionPageId(url);
  if (!pageId) {
    return NextResponse.json({ error: '유효한 Notion URL이 아닙니다.' }, { status: 400 });
  }

  if (!process.env.NOTION_API_KEY) {
    return NextResponse.json({ error: 'Notion API가 설정되지 않았습니다.' }, { status: 503 });
  }

  // 캐시 확인
  const cached = cache.get(pageId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return NextResponse.json(
      { markdown: cached.md, title: cached.title, cached: true },
      { headers: { 'Cache-Control': 'private, max-age=600' } }
    );
  }

  try {
    const [md, title] = await Promise.all([
      notionPageToMarkdown(pageId),
      getNotionPageTitle(pageId),
    ]);

    // 캐시 저장
    cache.set(pageId, { md, title, cachedAt: Date.now() });

    return NextResponse.json(
      { markdown: md, title, cached: false },
      { headers: { 'Cache-Control': 'private, max-age=600' } }
    );
  } catch (err: unknown) {
    console.error('[notion/page] fetch error:', err);
    const message = err instanceof Error ? err.message : '알 수 없는 오류';

    // Integration 공유 안 된 경우 안내
    if (message.includes('Could not find page') || message.includes('object_not_found')) {
      return NextResponse.json(
        { error: '페이지를 찾을 수 없습니다. Notion Integration에 페이지를 공유했는지 확인해주세요.' },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
