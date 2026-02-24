import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database';

export const runtime = 'nodejs';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB (클라이언트 압축 후 기준)

async function requireAuth(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  const admin = getAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function POST(request: Request) {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!bucket) return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });

  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: '이미지 파일만 업로드 가능합니다 (JPG, PNG, GIF, WEBP)' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: '파일 크기는 2MB 이하여야 합니다 (이미지는 자동 압축됩니다)' }, { status: 400 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const storagePath = `posts/${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const bytes = await file.arrayBuffer();
  const admin = getAdminClient();

  const { error: uploadError } = await admin.storage
    .from(bucket)
    .upload(storagePath, bytes, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // 10년짜리 signed URL
  const { data: signed, error: signedError } = await admin.storage
    .from(bucket)
    .createSignedUrl(storagePath, 315360000);

  if (signedError || !signed?.signedUrl) {
    return NextResponse.json({ error: 'URL 생성 실패' }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl, storagePath });
}
