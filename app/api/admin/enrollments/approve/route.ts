import { NextResponse } from 'next/server';
import { getAdminClient, db } from '@/lib/database';
import { sendPushToUser } from '@/lib/push';
import { sendSlack } from '@/lib/slack';

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

// POST /api/admin/enrollments/approve — 관리자: 수강 신청 승인
// { enrollmentId }
export async function POST(request: Request) {
  const adminUser = await requireAdmin(request);
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const { enrollmentId } = body ?? {};
  if (!enrollmentId) return NextResponse.json({ error: 'enrollmentId 필요' }, { status: 400 });

  const admin = getAdminClient();

  // 승인 전 정보 조회
  const { data: enrollmentData } = await admin
    .from('education_enrollments')
    .select('*, profiles(display_name, email), education_courses(title)')
    .eq('id', enrollmentId)
    .maybeSingle();

  if (!enrollmentData) {
    return NextResponse.json({ error: '수강 신청을 찾을 수 없습니다' }, { status: 404 });
  }

  // entry_code 생성 + 상태 confirmed로 변경
  const enrollment = await db.education.confirmEnrollment(admin, enrollmentId);

  const courseTitle = enrollmentData.education_courses?.title ?? '클래스';
  const userName = enrollmentData.profiles?.display_name ?? enrollmentData.profiles?.email ?? '수강자';
  const userId = enrollmentData.user_id;

  // 유료 클래스라면 purchase도 approved로 변경 (purchase_order_id가 있는 경우)
  if (enrollmentData.purchase_order_id) {
    await admin
      .from('purchases')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('order_id', enrollmentData.purchase_order_id)
      .eq('status', 'pending_bank');
  }

  // Slack 알림
  await sendSlack(
    `✅ 수강 신청 승인\n• 클래스: ${courseTitle}\n• 수강자: ${userName}\n• 입장코드: ${enrollment.entryCode}`
  ).catch(() => {});

  // 수강자에게 푸시 알림
  sendPushToUser(userId, {
    title: '수강 신청이 승인되었습니다! 🎓',
    body: `${courseTitle} 수강이 확정되었습니다. 입장코드를 확인하세요.`,
    url: '/my?tab=classes',
  }).catch(() => {});

  return NextResponse.json({ ok: true, entryCode: enrollment.entryCode });
}

// POST /api/admin/enrollments/approve — 취소도 처리 (action: 'cancel')
export async function DELETE(request: Request) {
  const adminUser = await requireAdmin(request);
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const { enrollmentId, notes } = body ?? {};
  if (!enrollmentId) return NextResponse.json({ error: 'enrollmentId 필요' }, { status: 400 });

  const admin = getAdminClient();
  await db.education.updateEnrollmentStatus(admin, enrollmentId, 'cancelled', notes);
  return NextResponse.json({ ok: true });
}
