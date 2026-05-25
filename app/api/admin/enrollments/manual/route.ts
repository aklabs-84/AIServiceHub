import { NextResponse } from 'next/server';
import { getAdminClient, db } from '@/lib/database';

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

// POST /api/admin/enrollments/manual — 관리자가 학생 직접 추가 (즉시 확정)
// body: { courseId, email, name? }
export async function POST(request: Request) {
  const adminUser = await requireAdmin(request);
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { courseId, email, name } = await request.json();
  if (!courseId || !email) {
    return NextResponse.json({ error: 'courseId와 email이 필요합니다' }, { status: 400 });
  }

  const admin = getAdminClient();

  // 1) 이메일로 프로필 조회
  const { data: profile } = await admin
    .from('profiles')
    .select('id, display_name, email')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (!profile) {
    return NextResponse.json(
      { error: '해당 이메일로 가입된 계정이 없습니다' },
      { status: 404 }
    );
  }

  // 2) 이미 수강 중인지 확인
  const existing = await db.education.getEnrollmentByUser(admin, courseId, profile.id);
  if (existing) {
    if (existing.status === 'confirmed') {
      return NextResponse.json({ error: '이미 수강 확정된 학생입니다' }, { status: 409 });
    }
    // 이미 신청 중이면 바로 확정 처리
    const enrollment = await db.education.confirmEnrollment(admin, existing.id);
    return NextResponse.json({ enrollment });
  }

  // 3) 새 수강 신청 생성
  const newEnrollment = await db.education.createEnrollment(admin, {
    courseId,
    userId: profile.id,
    userName: name?.trim() || profile.display_name || '',
    userEmail: profile.email || email,
  });

  // 4) 즉시 확정 + 입장코드 발급
  const confirmed = await db.education.confirmEnrollment(admin, newEnrollment.id);
  return NextResponse.json({ enrollment: confirmed });
}
