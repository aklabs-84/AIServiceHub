import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database';
import { db } from '@/lib/database';
import { purchases } from '@/lib/database/purchases';
import { isGateConfigured, signGateTicket } from '@/lib/gate';

export const runtime = 'nodejs';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'mosebb@gmail.com';

async function requireAuth(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  const admin = getAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// POST /api/apps/launch  { appId: string }
// 구매/구독 확인 후 공개 URL 반환 (URL 금고 패턴)
export async function POST(request: Request) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { appId } = body ?? {};
  if (!appId) return NextResponse.json({ error: '앱 ID가 필요합니다' }, { status: 400 });

  const admin = getAdminClient();
  const app = await db.apps.getById(admin, appId);
  if (!app) return NextResponse.json({ error: '앱을 찾을 수 없습니다' }, { status: 404 });

  // 입장권 모드 앱이면 짧은 유효시간의 입장권을 함께 준다 (접근 권한을 통과한 경우에만)
  const withTicket = async () => {
    const urls = app.appUrls.filter((u) => u.isPublic).map((u) => u.url);
    if (!app.gateMode) return NextResponse.json({ urls });
    if (!isGateConfigured()) return NextResponse.json({ error: 'gate_not_configured' }, { status: 503 });
    return NextResponse.json({ urls, ticket: await signGateTicket(app.id) }, { headers: { 'Cache-Control': 'no-store' } });
  };

  // 무료 앱이거나 관리자면 바로 반환
  if (!app.isPaid || app.price === 0 || user.email === ADMIN_EMAIL) {
    return withTicket();
  }

  // 유료 앱: 구매 or 구독 여부 확인
  const canAccess = await purchases.canAccess(admin, user.id, 'app', appId);
  if (!canAccess) {
    return NextResponse.json({ error: 'purchase_required', price: app.price }, { status: 403 });
  }

  return withTicket();
}
