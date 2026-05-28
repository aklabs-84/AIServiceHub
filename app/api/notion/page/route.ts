import { NextRequest, NextResponse } from 'next/server';
import { extractNotionPageId, notionPageToMarkdown, getNotionPageTitle } from '@/lib/notion';

export const runtime = 'nodejs';

// ── 서버 인메모리 캐시 (3분) ─────────────────────────────────────
const cache = new Map<string, { md: string; title: string; cachedAt: number }>();
const CACHE_TTL = 60 * 1000; // 1분 (서버 인스턴스 내 중복 요청 방지용)

/**
 * GET /api/notion/page?url={notionUrl}&fresh=1
 *
 * fresh=1 → 캐시를 무시하고 Notion에서 직접 재요청 (새로고침 버튼용)
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const fresh = request.nextUrl.searchParams.get('fresh') === '1';

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

  // 캐시 확인 (fresh=1 이면 항상 스킵)
  if (!fresh) {
    const cached = cache.get(pageId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
      return NextResponse.json(
        { markdown: cached.md, title: cached.title, cached: true },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
  }

  try {
    const [md, title] = await Promise.all([
      notionPageToMarkdown(pageId),
      getNotionPageTitle(pageId),
    ]);

    // 캐시 갱신 (fresh 여부와 무관하게 최신 내용으로 저장)
    cache.set(pageId, { md, title, cachedAt: Date.now() });

    return NextResponse.json(
      { markdown: md, title, cached: false },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: unknown) {
    console.error('[notion/page] fetch error:', err);
    const message = err instanceof Error ? err.message : '알 수 없는 오류';

    if (message.includes('Could not find page') || message.includes('object_not_found')) {
      return NextResponse.json(
        { error: '페이지를 찾을 수 없습니다. Notion Integration에 페이지를 공유했는지 확인해주세요.' },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
