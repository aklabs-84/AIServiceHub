import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database/client';

export const runtime = 'nodejs';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'mosebb@gmail.com';

async function requireAdmin(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  const admin = getAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user || user.email !== ADMIN_EMAIL) return null;
  return user;
}

// GET /api/admin/comments?limit=50&offset=0&targetType=all
export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const limit = Number(req.nextUrl.searchParams.get('limit') ?? 50);
  const offset = Number(req.nextUrl.searchParams.get('offset') ?? 0);
  const targetType = req.nextUrl.searchParams.get('targetType');

  const admin = getAdminClient();
  let query = admin
    .from('comments')
    .select('id, target_id, target_type, content, created_by, created_by_name, created_by_avatar_url, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (targetType && targetType !== 'all') {
    query = query.eq('target_type', targetType);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comments: data ?? [], total: count ?? 0 });
}

// DELETE /api/admin/comments?id=xxx
export async function DELETE(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const admin = getAdminClient();
  const { error } = await admin.from('comments').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// PATCH /api/admin/comments?id=xxx  { content }
export async function PATCH(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 });

  const admin = getAdminClient();
  const { error } = await admin
    .from('comments')
    .update({ content: content.trim(), updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
