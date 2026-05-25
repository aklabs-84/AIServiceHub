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

// GET /api/admin/enrollments?courseId=xxx
// 특정 클래스의 모든 수강 신청 목록 (관리자 전용)
export async function GET(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('courseId');
  if (!courseId) return NextResponse.json({ error: 'courseId 필요' }, { status: 400 });

  const admin = getAdminClient();
  const enrollments = await db.education.getEnrollmentsByCourse(admin, courseId);

  return NextResponse.json({ enrollments });
}
