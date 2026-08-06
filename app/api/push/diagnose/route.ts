import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServerClient } from '@/lib/database/server';
import { getAdminClient } from '@/lib/database';
import { sendPushToUser } from '@/lib/push';

const ADMIN_EMAIL = 'mosebb@gmail.com';

// 서버가 들고 있는 개인키에서 공개키를 역산해, 클라이언트가 구독 시 사용한
// NEXT_PUBLIC_VAPID_PUBLIC_KEY와 실제로 짝이 맞는지 확인(private key를 그대로
// 노출하지 않고도 "BadJwtToken" 원인이 키 불일치인지 판별 가능)
function derivedPublicKeyMatches(privateKey: string, publicKey: string): boolean {
  try {
    const ecdh = crypto.createECDH('prime256v1');
    ecdh.setPrivateKey(Buffer.from(privateKey, 'base64url'));
    return ecdh.getPublicKey().toString('base64url') === publicKey;
  } catch {
    return false;
  }
}

// 로그인한 관리자 계정으로 실제 테스트 푸시를 보내고, 무엇이 실패했는지 그대로 반환한다.
// 브라우저에서 이 URL을 열어 로그인 상태로 GET 요청하면 바로 진단 결과를 볼 수 있다.
export async function GET() {
  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = getAdminClient();
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, created_at')
    .eq('user_id', user.id);

  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidKeyPairMatches =
    privateKey && publicKey ? derivedPublicKeyMatches(privateKey, publicKey) : null;

  const result = await sendPushToUser(user.id, {
    title: '테스트 알림',
    body: '이 알림이 왔다면 푸시 연동이 정상 동작하는 거예요',
    url: '/apps',
  });

  return NextResponse.json({
    userId: user.id,
    subscriptionsInDb: subs ?? [],
    vapidKeyPairMatches,
    ...result,
  });
}
