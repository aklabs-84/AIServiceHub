import { NextResponse } from 'next/server';
import { getAdminClient, db } from '@/lib/database';

export const runtime = 'nodejs';

async function requireAuth(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  const admin = getAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// GET /api/enrollments/[id] — 내 수강 신청 단건 조회 (entry_code 포함)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminClient();

  // entry_code로 조회 (클래스룸 접근 코드)
  if (id.length >= 8 && /^[A-Z0-9]+$/.test(id)) {
    const enrollment = await db.education.getEnrollmentByCode(admin, id);
    if (!enrollment) return NextResponse.json({ error: '유효하지 않은 입장코드입니다' }, { status: 404 });
    if (enrollment.status !== 'confirmed') return NextResponse.json({ error: '승인된 수강 신청이 아닙니다' }, { status: 403 });
    return NextResponse.json({ enrollment });
  }

  // UUID로 조회
  const { data } = await admin
    .from('education_enrollments')
    .select('*, education_courses(title, price, is_paid)')
    .eq('id', id)
    .eq('user_id', user.id) // 본인 것만
    .maybeSingle();

  if (!data) return NextResponse.json({ error: '수강 신청을 찾을 수 없습니다' }, { status: 404 });
  return NextResponse.json({ enrollment: data });
}
