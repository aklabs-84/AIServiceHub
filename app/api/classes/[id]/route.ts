import { NextResponse } from 'next/server';
import { getAdminClient, db } from '@/lib/database';
import type { UpdateCourseInput } from '@/types/database';

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

// PATCH /api/classes/[id] — 관리자: 클래스 수정
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body: Partial<UpdateCourseInput> = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });

  const admin = getAdminClient();
  const course = await db.education.updateCourse(admin, { id, ...body });
  return NextResponse.json({ course });
}

// DELETE /api/classes/[id] — 관리자: 클래스 삭제
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = getAdminClient();
  await db.education.deleteCourse(admin, id);
  return NextResponse.json({ ok: true });
}
