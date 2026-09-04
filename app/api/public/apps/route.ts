import { NextResponse } from 'next/server';
import { getAdminClient, db } from '@/lib/database';
import type { AIApp } from '@/types/database';

export const runtime = 'nodejs';

function isAuthorized(request: Request): boolean {
  const key = request.headers.get('x-api-key');
  const expected = process.env.PUBLIC_API_KEY;
  return !!expected && key === expected;
}

function serializeApp(app: AIApp) {
  return {
    id: app.id,
    name: app.name,
    description: app.description,
    category: app.category,
    tags: app.tags,
    thumbnailUrl: app.thumbnailUrl,
    appUrls: app.appUrls.filter((u) => u.isPublic).map((u) => ({ url: u.url, label: u.label })),
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

  const admin = getAdminClient();
  const apps = await db.apps.getPublicList(admin, { category, tag, limit, offset });

  return NextResponse.json({ apps: apps.map(serializeApp) });
}
