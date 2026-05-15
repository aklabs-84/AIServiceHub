import { NextResponse } from 'next/server';
import { getAdminClient, db } from '@/lib/database';
import { purchases } from '@/lib/database/purchases';

export const runtime = 'nodejs';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'mosebb@gmail.com';

async function requireAdmin(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  const admin = getAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user || user.email !== ADMIN_EMAIL) return null;
  return user;
}

// POST /api/admin/purchases/approve  { orderId }
export async function POST(request: Request) {
  const admin_user = await requireAdmin(request);
  if (!admin_user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const { orderId } = body ?? {};
  if (!orderId) return NextResponse.json({ error: 'orderId 필요' }, { status: 400 });

  const admin = getAdminClient();

  // 승인 전 구매 정보 조회 (Slack 알림용)
  const { data: purchaseData } = await admin
    .from('purchases')
    .select('*, product_id, product_type, amount, depositor_name')
    .eq('order_id', orderId)
    .eq('status', 'pending_bank')
    .maybeSingle();

  if (!purchaseData) {
    return NextResponse.json({ error: '입금 대기 중인 주문을 찾을 수 없습니다' }, { status: 404 });
  }

  await purchases.approveBankTransfer(admin, orderId);

  // 상품명 조회
  let productName = purchaseData.product_id ?? '알 수 없음';
  try {
    if (purchaseData.product_type === 'app') {
      const app = await db.apps.getById(admin, purchaseData.product_id);
      if (app) productName = app.name;
    } else if (purchaseData.product_type === 'prompt') {
      const prompt = await db.prompts.getById(admin, purchaseData.product_id);
      if (prompt) productName = prompt.name;
    }
  } catch { /* 상품명 조회 실패해도 승인은 완료됨 */ }

  // Slack 알림 (백그라운드)
  fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/notify/slack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'bank_approved',
      productName,
      amount: purchaseData.amount,
      depositorName: purchaseData.depositor_name,
    }),
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
