import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database';
import { purchases } from '@/lib/database/purchases';

export const runtime = 'nodejs';

async function requireAuth(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  const admin = getAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// POST /api/payments/confirm
// Toss 결제 승인 요청 → DB confirmPayment → 구독이면 createSubscription
export async function POST(request: Request) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { paymentKey, orderId, amount, productType } = body ?? {};

  if (!paymentKey || !orderId || !amount) {
    return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 });
  }

  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: '결제 설정 오류' }, { status: 500 });
  }

  // Toss 결제 승인 API 호출
  const encoded = Buffer.from(`${secretKey}:`).toString('base64');
  const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${encoded}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  if (!tossRes.ok) {
    const err = await tossRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: err.message || '결제 승인 실패', code: err.code },
      { status: tossRes.status }
    );
  }

  const admin = getAdminClient();

  // DB에 결제 완료 처리
  const purchase = await purchases.confirmPayment(admin, orderId, paymentKey);

  // 구독 상품이면 subscriptions 테이블에도 반영
  if (productType === 'subscription' && body?.plan) {
    await purchases.createSubscription(admin, {
      userId: user.id,
      plan: body.plan,
      orderId,
      amount,
    });
  }

  return NextResponse.json({ ok: true, purchase });
}
