import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database';
import { purchases } from '@/lib/database/purchases';

export const runtime = 'nodejs';

// Toss 웹훅은 Secret Key로 Basic Auth 헤더를 보냄
// Authorization: Basic base64(secretKey:)
function verifyTossWebhook(request: Request): boolean {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) return false;

  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Basic ')) return false;

  const decoded = Buffer.from(auth.slice(6), 'base64').toString();
  const expected = `${secretKey}:`;
  return decoded === expected;
}

// POST /api/payments/webhook
// Toss 대시보드 > 웹훅 URL에 이 엔드포인트를 등록
export async function POST(request: Request) {
  // Toss 서버에서 보낸 요청인지 검증
  if (!verifyTossWebhook(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const { eventType, data } = body;
  const admin = getAdminClient();

  try {
    switch (eventType) {
      case 'PAYMENT_STATUS_CHANGED': {
        const { orderId, paymentKey, status } = data ?? {};
        if (!orderId) break;

        if (status === 'DONE') {
          await purchases.confirmPayment(admin, orderId, paymentKey);
        } else if (status === 'CANCELED' || status === 'PARTIAL_CANCELED') {
          await admin
            .from('purchases')
            .update({ status: 'cancelled' })
            .eq('order_id', orderId)
            .eq('status', 'paid');
        }
        break;
      }

      case 'CANCEL_STATUS_CHANGED': {
        const { orderId } = data ?? {};
        if (orderId) {
          await admin
            .from('purchases')
            .update({ status: 'refunded' })
            .eq('order_id', orderId);
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('[webhook] error:', err);
    // 200 반환해야 Toss가 재시도하지 않음
  }

  return NextResponse.json({ ok: true });
}
