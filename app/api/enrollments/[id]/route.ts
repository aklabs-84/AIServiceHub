import { NextResponse } from 'next/server';
import { getAdminClient, db } from '@/lib/database';
import { sendSlack } from '@/lib/slack';

export const runtime = 'nodejs';

// entry_code 패턴: 8자 대문자 영숫자 (하이픈 없음)
const ENTRY_CODE_PATTERN = /^[A-Z0-9]{8}$/;

async function requireAuth(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  const admin = getAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// GET /api/enrollments/[id]
// - entry_code (8자 영숫자): 비로그인 허용 — 교실 입장 코드 검증
// - UUID: 로그인 필수 — 본인 수강 신청 단건 조회
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = getAdminClient();

  // ── entry_code로 조회 (비로그인 허용) ──────────────────────────────────
  if (ENTRY_CODE_PATTERN.test(id)) {
    // 1) 개인 입장코드 확인
    const enrollment = await db.education.getEnrollmentByCode(admin, id);
    if (enrollment) {
      if (enrollment.status !== 'confirmed') {
        return NextResponse.json({ error: '승인된 수강 신청이 아닙니다' }, { status: 403 });
      }
      return NextResponse.json({ enrollment });
    }

    // 2) 클래스 단일 입장코드 확인 (오프라인 등 전원 공용 코드)
    const course = await db.education.getCourseByClassEntryCode(admin, id);
    if (course) {
      // classAccess: true 로 반환 — ClassroomClient에서 교실 진입 처리
      return NextResponse.json({ classAccess: true, courseId: course.id });
    }

    return NextResponse.json({ error: '유효하지 않은 입장코드입니다' }, { status: 404 });
  }

  // ── UUID로 조회 (로그인 필수) ───────────────────────────────────────────
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await admin
    .from('education_enrollments')
    .select('*, education_courses(title, price, is_paid)')
    .eq('id', id)
    .eq('user_id', user.id) // 본인 것만
    .maybeSingle();

  if (!data) return NextResponse.json({ error: '수강 신청을 찾을 수 없습니다' }, { status: 404 });
  return NextResponse.json({ enrollment: data });
}

// DELETE /api/enrollments/[id] — 본인 수강 신청 취소 (pending/waitlist만 가능)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminClient();

  // 본인 신청 조회
  const { data: row } = await admin
    .from('education_enrollments')
    .select('*, education_courses(title, price, is_paid)')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: '수강 신청을 찾을 수 없습니다' }, { status: 404 });
  if (row.status === 'confirmed') {
    return NextResponse.json({ error: '수강 확정 후에는 취소할 수 없습니다. 관리자에게 문의해 주세요.' }, { status: 400 });
  }
  if (row.status === 'cancelled') {
    return NextResponse.json({ error: '이미 취소된 신청입니다' }, { status: 400 });
  }

  // 취소 처리
  await db.education.updateEnrollmentStatus(admin, id, 'cancelled');

  // Slack 알림
  const courseTitle = row.education_courses?.title ?? '(알 수 없음)';
  const isPaid = row.education_courses?.is_paid ?? false;
  const price = row.education_courses?.price ?? 0;
  await sendSlack(
    `❌ 클래스 수강 취소\n• 클래스: ${courseTitle}\n• 신청자: ${row.user_email || user.email}\n${isPaid && price > 0 ? `• 금액: ${price.toLocaleString()}원 (입금 여부 확인 필요)\n` : ''}• 취소 전 상태: ${row.status}`
  ).catch(() => {});

  return NextResponse.json({ ok: true });
}
