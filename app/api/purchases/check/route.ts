import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database';
import { purchases } from '@/lib/database/purchases';
import type { ProductType } from '@/types/database';

export const runtime = 'nodejs';

async function requireAuth(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  const admin = getAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'mosebb@gmail.com';

// GET /api/purchases/check?productType=app&productId=xxx
export async function GET(request: Request) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ canAccess: false, reason: 'unauthenticated' });

  // 관리자는 모든 콘텐츠에 접근 가능
  if (user.email === ADMIN_EMAIL) {
    return NextResponse.json({ canAccess: true, reason: 'admin' });
  }

  const { searchParams } = new URL(request.url);
  const productType = searchParams.get('productType') as ProductType | null;
  const productId = searchParams.get('productId');

  if (!productType || !productId) {
    return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 });
  }

  const admin = getAdminClient();
  const canAccess = await purchases.canAccess(admin, user.id, productType, productId);

  return NextResponse.json({ canAccess });
}
