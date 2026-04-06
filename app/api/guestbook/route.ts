import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database/client';
import { getServerClient } from '@/lib/database/server';

// GET /api/guestbook?owner_id=xxx  → 방명록 목록
export async function GET(req: NextRequest) {
  const owner_id = req.nextUrl.searchParams.get('owner_id');
  if (!owner_id) return NextResponse.json({ error: 'owner_id required' }, { status: 400 });

  const admin = getAdminClient();
  const { data, error } = await admin
    .from('guestbook')
    .select(`id, content, created_at, writer:profiles!writer_id(id, display_name, avatar_url, username)`)
    .eq('owner_id', owner_id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/guestbook  → 방명록 작성 (로그인 필요)
export async function POST(req: NextRequest) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { owner_id, content } = await req.json();
  if (!owner_id || !content?.trim()) {
    return NextResponse.json({ error: 'owner_id and content required' }, { status: 400 });
  }
  if (content.trim().length > 200) {
    return NextResponse.json({ error: '200자 이내로 작성해주세요' }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from('guestbook')
    .insert({ owner_id, writer_id: user.id, content: content.trim() })
    .select(`id, content, created_at, writer:profiles!writer_id(id, display_name, avatar_url, username)`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/guestbook?id=xxx  → 삭제 (owner 또는 writer 가능)
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminClient();
  // 작성자 또는 페이지 주인만 삭제 가능
  const { data: entry } = await admin.from('guestbook').select('owner_id, writer_id').eq('id', id).single();
  if (!entry || (entry.owner_id !== user.id && entry.writer_id !== user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await admin.from('guestbook').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
