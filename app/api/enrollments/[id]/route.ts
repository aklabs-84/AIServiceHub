import { NextResponse } from 'next/server';
import { getAdminClient, db } from '@/lib/database';

export const runtime = 'nodejs';

// entry_code 패턴: 8자 대문자 영숫자 (하이픈 없음)
const ENTRY_CODE_PATTERN = /^[A-Z0-9]{8}$/;

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
