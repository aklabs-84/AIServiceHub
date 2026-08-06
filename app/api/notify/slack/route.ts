import { NextResponse } from 'next/server';
import { sendAdminPush } from '@/lib/push';

const slackWebhook = process.env.SLACK_WEBHOOK_URL;

export async function POST(request: Request) {
  if (!slackWebhook) {
    return NextResponse.json({ error: 'Slack webhook not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { type } = body as { type?: string };

    let text = '';
    switch (type) {
      case 'app':
        text = `🆕 새 앱 등록: ${body.name} (작성자: ${body.author}${body.url ? `, URL: ${body.url}` : ''})`;
        await sendAdminPush({
          title: '새 앱 등록',
          body: `${body.author}님이 "${body.name}" 앱을 등록했어요`,
          url: `/apps/${body.id}`,
        });
        break;
      case 'prompt':
        text = `🆕 새 프롬프트 등록: ${body.name} (작성자: ${body.author}${body.category ? `, 카테고리: ${body.category}` : ''})`;
        await sendAdminPush({
          title: '새 프롬프트 등록',
          body: `${body.author}님이 "${body.name}" 프롬프트를 등록했어요`,
          url: `/prompts/${body.id}`,
        });
        break;
      case 'signup':
        text = `🆕 새 회원 가입: ${body.name || '신규 사용자'} (${body.email ?? body.uid})`;
        break;
      case 'bank_request':
        text = `💰 계좌이체 입금 신청\n• 상품: ${body.productName}\n• 금액: ${Number(body.amount).toLocaleString()}원\n• 입금자명: ${body.depositorName}\n• 주문번호: ${body.orderId}\n⚠️ 관리자 대시보드에서 입금 확인 후 승인해 주세요.`;
        break;
      case 'bank_approved':
        text = `✅ 계좌이체 승인 완료\n• 상품: ${body.productName}\n• 금액: ${Number(body.amount).toLocaleString()}원\n• 입금자명: ${body.depositorName}`;
        break;
      default:
        text = '새 알림이 도착했습니다.';
    }

    await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Slack notify error', err);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
