import { NextResponse } from 'next/server';
import { getAdminClient, db } from '@/lib/database';
import type { AIApp } from '@/types/database';
import { stripMarkdown } from '@/lib/stripMarkdown';

export const runtime = 'nodejs';

function isAuthorized(request: Request): boolean {
  const key = request.headers.get('x-api-key');
  const expected = process.env.PUBLIC_API_KEY;
  return !!expected && key === expected;
}

// 공개 URL이 없고 HTML 코드로만 등록된 앱은 사이트가 직접 서빙하는 프록시 주소를 대신 내려준다.
// (htmlPreviewUrl은 signed URL이라 브라우저에서 렌더링되지 않고 다운로드되므로 그대로 쓰지 않는다.)
function resolveAppUrls(app: AIApp, origin: string) {
  const urls = app.appUrls
    .filter((u) => u.isPublic && u.url.trim())
    .map((u) => ({ url: u.url, label: u.label }));
  if (urls.length === 0 && app.htmlPreviewUrl) {
    return [{ url: `${origin}/api/apps/${app.id}/html-preview`, label: 'HTML 앱' }];
  }
  return urls;
}

function serializeApp(app: AIApp, origin: string) {
  return {
    id: app.id,
    name: app.name,
    description: stripMarkdown(app.description),
    category: app.category,
    tags: app.tags,
    thumbnailUrl: app.thumbnailUrl,
    appUrls: resolveAppUrls(app, origin),
    price: app.price,
    isPaid: app.isPaid,
    likeCount: app.likeCount,
    createdAt: app.createdAt,
  };
}

// GET /api/public/apps?category=&tag=&limit=&offset=
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || undefined;
  const tag = searchParams.get('tag') || undefined;
  const limit = Number(searchParams.get('limit')) || undefined;
  const offset = Number(searchParams.get('offset')) || undefined;
  const classlogOnly = searchParams.get('classlogOnly') === 'true';

  const admin = getAdminClient();
  const apps = await db.apps.getPublicList(admin, { category, tag, limit, offset, classlogOnly });

  const { origin } = new URL(request.url);
  return NextResponse.json({ apps: apps.map((app) => serializeApp(app, origin)) });
}
