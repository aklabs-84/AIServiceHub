import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database/client';
import { getServerClient } from '@/lib/database/server';

// GET /api/course-comments?courseId=xxx
export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get('courseId');
  if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 });

  const admin = getAdminClient();
  const { data, error } = await admin
    .from('comments')
    .select('id, content, created_at, created_by, created_by_name, created_by_avatar_url')
    .eq('target_type', 'course')
    .eq('target_id', courseId)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/course-comments
export async function POST(req: NextRequest) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { courseId, content } = await req.json();
  if (!courseId || !content?.trim()) {
    return NextResponse.json({ error: 'courseId and content required' }, { status: 400 });
  }
  if (content.trim().length > 500) {
    return NextResponse.json({ error: '500자 이내로 작성해주세요' }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', user.id)
    .single();

  const { data, error } = await admin
    .from('comments')
    .insert({
      target_type: 'course',
      target_id: courseId,
      content: content.trim(),
      created_by: user.id,
      created_by_name: profile?.display_name ?? user.email ?? '익명',
      created_by_avatar_url: profile?.avatar_url ?? null,
    })
    .select('id, content, created_at, created_by, created_by_name, created_by_avatar_url')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/course-comments?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminClient();
  const { data: comment } = await admin
    .from('comments')
    .select('created_by')
    .eq('id', id)
    .eq('target_type', 'course')
    .single();

  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isAdmin = user.email === 'mosebb@gmail.com';
  if (comment.created_by !== user.id && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await admin.from('comments').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
