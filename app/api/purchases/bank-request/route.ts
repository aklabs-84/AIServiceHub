import { NextResponse } from 'next/server';
import { getAdminClient, db } from '@/lib/database';
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

// POST /api/purchases/bank-request
// { productType, productId, depositorName }
export async function POST(request: Request) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { productType, productId, depositorName } = body ?? {};

  if (!productType || !productId || !depositorName?.trim()) {
    return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 });
  }

  const admin = getAdminClient();
  let amount = 0;
  let productName = '';

  if (productType === 'app') {
    const app = await db.apps.getById(admin, productId);
    if (!app) return NextResponse.json({ error: '앱을 찾을 수 없습니다' }, { status: 404 });
    if (!app.isPaid || app.price === 0) return NextResponse.json({ error: '무료 앱은 구매가 불필요합니다' }, { status: 400 });
    amount = app.price;
    productName = app.name;
  } else if (productType === 'prompt') {
    const prompt = await db.prompts.getById(admin, productId);
    if (!prompt) return NextResponse.json({ error: '프롬프트를 찾을 수 없습니다' }, { status: 404 });
    if (!prompt.isPaid || prompt.price === 0) return NextResponse.json({ error: '무료 프롬프트는 구매가 불필요합니다' }, { status: 400 });
    amount = prompt.price;
    productName = prompt.name;
  } else {
    return NextResponse.json({ error: '지원하지 않는 상품 유형입니다' }, { status: 400 });
  }

  // 이미 입금 대기 중인 건이 있으면 중복 방지
  const { data: existing } = await admin
    .from('purchases')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .in('status', ['pending_bank', 'paid'])
    .maybeSingle();

  if (existing?.status === 'paid') {
    return NextResponse.json({ error: '이미 구매한 상품입니다' }, { status: 409 });
  }
  if (existing?.status === 'pending_bank') {
    return NextResponse.json({ error: '이미 입금 신청 중인 상품입니다. 관리자 확인을 기다려 주세요.' }, { status: 409 });
  }

  const orderId = `bank_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

  await purchases.createBankRequest(admin, {
    userId: user.id,
    productType: productType as ProductType,
    productId,
    amount,
    orderId,
    depositorName: depositorName.trim(),
  });

  // Slack 알림 (백그라운드, 실패 무시)
  fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/notify/slack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'bank_request',
      productName,
      amount,
      depositorName: depositorName.trim(),
      orderId,
    }),
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    orderId,
    amount,
    productName,
    bankInfo: {
      bankName: process.env.NEXT_PUBLIC_BANK_NAME || '',
      accountNumber: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || '',
      accountHolder: process.env.NEXT_PUBLIC_BANK_ACCOUNT_HOLDER || '',
    },
  });
}
