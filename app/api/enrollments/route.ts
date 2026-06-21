import { NextResponse } from 'next/server';
import { getAdminClient, db } from '@/lib/database';
import { purchases } from '@/lib/database/purchases';
import { sendSlack } from '@/lib/slack';
import { sendAdminPush } from '@/lib/push';

export const runtime = 'nodejs';

async function requireAuth(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  const admin = getAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// GET /api/enrollments?courseId=xxx — 내 수강 신청 조회
export async function GET(request: Request) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('courseId');

  const admin = getAdminClient();

  if (courseId) {
    const enrollment = await db.education.getEnrollmentByUser(admin, courseId, user.id);
    return NextResponse.json({ enrollment });
  }

  const enrollments = await db.education.getMyEnrollments(admin, user.id);
  return NextResponse.json({ enrollments });
}

// POST /api/enrollments — 수강 신청
// { courseId, depositorName? }
export async function POST(request: Request) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { courseId, depositorName } = body ?? {};
  if (!courseId) return NextResponse.json({ error: 'courseId 필요' }, { status: 400 });

  const admin = getAdminClient();

  // 클래스 정보
  const course = await db.education.getCourseById(admin, courseId);
  if (!course) return NextResponse.json({ error: '클래스를 찾을 수 없습니다' }, { status: 404 });
  if (!course.isPublished) return NextResponse.json({ error: '비공개 클래스입니다' }, { status: 403 });

  // 중복 신청 확인
  const existing = await db.education.getEnrollmentByUser(admin, courseId, user.id);
  if (existing) {
    const msgMap: Record<string, string> = {
      confirmed: '이미 확정된 수강 신청이 있습니다',
      pending:   '이미 신청 중입니다. 관리자 승인을 기다려 주세요.',
      waitlist:  '이미 대기자 명단에 있습니다',
    };
    if (msgMap[existing.status]) return NextResponse.json({ error: msgMap[existing.status] }, { status: 409 });
  }

  // 정원 확인 → waitlist
  let isWaitlist = false;
  if (course.maxParticipants && course.maxParticipants > 0) {
    const count = await db.education.getEnrollmentCount(admin, courseId);
    if (count >= course.maxParticipants) isWaitlist = true;
  }

  // 사용자 이름/이메일 조회
  const { data: profile } = await admin
    .from('profiles')
    .select('display_name, email')
    .eq('id', user.id)
    .maybeSingle();
  const userName = profile?.display_name || user.email || '';
  const userEmail = profile?.email || user.email || '';

  let bankInfo: object | undefined;
  let purchaseOrderId: string | undefined;

  // 유료 클래스: 계좌이체 신청
  if (course.isPaid && course.price > 0) {
    if (!depositorName?.trim()) {
      return NextResponse.json({ error: '유료 클래스는 입금자명이 필요합니다' }, { status: 400 });
    }
    const orderId = `bank_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    await purchases.createBankRequest(admin, {
      userId: user.id,
      productType: 'education',
      productId: courseId,
      amount: course.price,
      orderId,
      depositorName: depositorName.trim(),
    });
    purchaseOrderId = orderId;
    bankInfo = {
      bankName: process.env.NEXT_PUBLIC_BANK_NAME || '',
      accountNumber: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || '',
      accountHolder: process.env.NEXT_PUBLIC_BANK_ACCOUNT_HOLDER || '',
    };
  }

  // 수강 신청 생성
  const enrollment = await db.education.createEnrollment(admin, {
    courseId,
    userId: user.id,
    userName,
    userEmail,
  });

  // 대기자 상태 업데이트
  if (isWaitlist) {
    await db.education.updateEnrollmentStatus(admin, enrollment.id, 'waitlist');
  }

  // Slack 알림
  const slackMsg = course.isPaid && course.price > 0
    ? `📚 클래스 수강 신청 (유료)\n• 클래스: ${course.title}\n• 금액: ${course.price.toLocaleString()}원\n• 입금자명: ${depositorName?.trim()}\n• 신청자: ${userEmail}\n${isWaitlist ? '⏳ 대기자로 등록됨\n' : ''}⚠️ 관리자 대시보드에서 입금 확인 후 승인해 주세요.`
    : `📚 클래스 수강 신청 (무료)\n• 클래스: ${course.title}\n• 신청자: ${userEmail}\n${isWaitlist ? '⏳ 대기자로 등록됨\n' : ''}⚠️ 관리자 대시보드에서 승인해 주세요.`;

  await sendSlack(slackMsg).catch(() => {});
  await sendAdminPush({
    title: isWaitlist ? '⏳ 클래스 수강 신청 (대기)' : `📚 클래스 수강 신청${course.isPaid && course.price > 0 ? ' (유료)' : ' (무료)'}`,
    body: `${course.title} | ${userEmail}`,
    url: '/admin?tab=enrollments',
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    enrollmentId: enrollment.id,
    isWaitlist,
    ...(bankInfo ? { bankInfo, orderId: purchaseOrderId } : {}),
  }, { status: 201 });
}
