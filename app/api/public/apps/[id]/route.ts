import { NextResponse } from 'next/server';
import { getAdminClient, db } from '@/lib/database';
import type { AIApp } from '@/types/database';

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
    description: app.description,
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

// GET /api/public/apps/:id
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const admin = getAdminClient();
  const app = await db.apps.getPublicById(admin, id);
  if (!app) {
    return NextResponse.json({ error: '앱을 찾을 수 없습니다' }, { status: 404 });
  }

  const { origin } = new URL(request.url);
  return NextResponse.json({ app: serializeApp(app, origin) });
}
