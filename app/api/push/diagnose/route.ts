import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/database/server';
import { getAdminClient } from '@/lib/database';
import { sendPushToUser } from '@/lib/push';

const ADMIN_EMAIL = 'mosebb@gmail.com';

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

  const result = await sendPushToUser(user.id, {
    title: '테스트 알림',
    body: '이 알림이 왔다면 푸시 연동이 정상 동작하는 거예요',
    url: '/apps',
  });

  return NextResponse.json({
    userId: user.id,
    subscriptionsInDb: subs ?? [],
    ...result,
  });
}
