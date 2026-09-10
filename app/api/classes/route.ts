import { NextResponse } from 'next/server';
import { getAdminClient, db } from '@/lib/database';
import { classlog } from '@/lib/classlog';
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

  // ClassLog 동기화가 켜진 강좌면 ClassLog에 클래스를 생성/연결한다.
  // 실패해도 강좌 생성 자체는 이미 완료된 상태이므로 에러를 삼키고 로그만 남긴다.
  if (body.classlogSyncEnabled) {
    try {
      const result = await classlog.syncClass({
        externalRefId: course.id,
        teacherEmail: user.email!,
        className: course.title,
      });
      await db.education.setClasslogSyncResult(admin, course.id, result.class_id, result.entry_code);
    } catch (err) {
      console.error('[api/classes] ClassLog sync failed:', (err as Error).message);
    }
  }

  return NextResponse.json({ course }, { status: 201 });
}
