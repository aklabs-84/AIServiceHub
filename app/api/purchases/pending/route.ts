import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database';
import { db } from '@/lib/database';
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

// POST /api/purchases/pending  { productType, productId }
// 결제 시작 전 pending 레코드 생성 → orderId + 서버 검증된 금액 반환
// 클라이언트가 가격을 임의로 바꿀 수 없도록 서버에서 price를 조회
export async function POST(request: Request) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { productType, productId } = body ?? {};

  if (!productType || !productId) {
    return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 });
  }

  const admin = getAdminClient();
  let amount = 0;
  let productName = '';

  if (productType === 'app') {
    const app = await db.apps.getById(admin, productId);
    if (!app) return NextResponse.json({ error: '앱을 찾을 수 없습니다' }, { status: 404 });
    if (!app.isPaid || app.price === 0) {
      return NextResponse.json({ error: '무료 앱은 구매가 불필요합니다' }, { status: 400 });
    }
    amount = app.price;
    productName = app.name;
  } else if (productType === 'prompt') {
    const prompt = await db.prompts.getById(admin, productId);
    if (!prompt) return NextResponse.json({ error: '프롬프트를 찾을 수 없습니다' }, { status: 404 });
    if (!prompt.isPaid || prompt.price === 0) {
      return NextResponse.json({ error: '무료 프롬프트는 구매가 불필요합니다' }, { status: 400 });
    }
    amount = prompt.price;
    productName = prompt.name;
  } else {
    return NextResponse.json({ error: '지원하지 않는 상품 유형입니다' }, { status: 400 });
  }

  const orderId = `order_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

  await purchases.createPending(admin, {
    userId: user.id,
    productType: productType as ProductType,
    productId,
    amount,
    orderId,
  });

  return NextResponse.json({ orderId, amount, productName });
}
