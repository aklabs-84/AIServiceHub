import { NextResponse } from 'next/server';
import { getAdminClient, db } from '@/lib/database';
import type { CreateCourseInput } from '@/types/database';

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

// GET /api/classes — 관리자: 전체 목록
export async function GET(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = getAdminClient();
  const courses = await db.education.getAllCourses(admin);
  return NextResponse.json({ courses });
}

// POST /api/classes — 관리자: 클래스 생성
export async function POST(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body: CreateCourseInput = await request.json().catch(() => null);
  if (!body?.title?.trim()) {
    return NextResponse.json({ error: '제목은 필수입니다' }, { status: 400 });
  }

  const admin = getAdminClient();
  // 관리자 이름 조회
  const { data: profile } = await admin
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();
  const userName = profile?.display_name || user.email || 'Admin';

  const course = await db.education.createCourse(admin, body, user.id, userName);
  return NextResponse.json({ course }, { status: 201 });
}
