import { NextResponse } from 'next/server';

const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      contact,
      idea,
      budget,
      dueDate,
      reference,
    } = body || {};

    if (!name || !contact || !idea) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '새 제작 의뢰가 도착했습니다',
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*이름/닉네임*\n${name}` },
          { type: 'mrkdwn', text: `*연락처*\n${contact}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*요청 내용*\n${idea}` },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*희망 예산*\n${budget || '-'}` },
          { type: 'mrkdwn', text: `*희망 완료일*\n${dueDate || '-'}` },
        ],
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*참고 링크*\n${reference || '-'}` },
        ],
      },
    ];

    if (!WEBHOOK_URL) {
      return NextResponse.json({ error: 'Missing webhook configuration' }, { status: 500 });
    }

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Slack webhook failed' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Slack webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
