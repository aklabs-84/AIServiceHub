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

  return NextResponse.json({ app: serializeApp(app) });
}
