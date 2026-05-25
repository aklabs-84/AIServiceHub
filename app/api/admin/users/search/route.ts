import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database';

export const runtime = 'nodejs';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'mosebb@gmail.com';

// GET /api/admin/users/search?q=검색어 — 이메일/이름으로 사용자 검색 (관리자 전용)
export async function GET(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  if (q.length < 1) return NextResponse.json({ users: [] });

  const { data } = await admin
    .from('profiles')
    .select('id, email, display_name')
    .or(`email.ilike.%${q}%,display_name.ilike.%${q}%`)
    .order('email', { ascending: true })
    .limit(8);

  const users = (data ?? []).map((p: { id: string; email: string | null; display_name: string | null }) => ({
    id: p.id,
    email: p.email ?? '',
    displayName: p.display_name ?? '',
  }));

  return NextResponse.json({ users });
}
