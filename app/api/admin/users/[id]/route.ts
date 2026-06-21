import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database';

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

// DELETE /api/admin/users/[id] — 사용자 삭제 (관리자 전용)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const adminUser = await requireAdmin(request);
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // 관리자 본인 삭제 방지
  if (id === adminUser.id) {
    return NextResponse.json({ error: '관리자 본인은 삭제할 수 없습니다' }, { status: 400 });
  }

  const admin = getAdminClient();

  // profiles 먼저 삭제 (FK 제약 방지)
  await admin.from('profiles').delete().eq('id', id);

  // Supabase Auth에서 사용자 삭제
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
