import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database';

export const runtime = 'nodejs';

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

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
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  let htmlCode: string;
  let appId: string;
  try {
    const body = await request.json();
    htmlCode = body.htmlCode;
    appId = body.appId;
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식' }, { status: 400 });
  }

  if (!htmlCode || !appId) {
    return NextResponse.json({ error: 'htmlCode와 appId가 필요합니다.' }, { status: 400 });
  }

  const bytes = new TextEncoder().encode(htmlCode);
  if (bytes.byteLength > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'HTML 코드는 2MB 이하여야 합니다.' }, { status: 400 });
  }

  // 파일명에 userId 포함: 다른 사람 앱을 덮어쓰지 못하도록
  const storagePath = `html-preview/${appId}.html`;
  const admin = getAdminClient();

  const { error: uploadError } = await admin.storage
    .from(bucket)
    .upload(storagePath, bytes, {
      contentType: 'text/html; charset=utf-8',
      upsert: true,
    });

  if (uploadError) {
    console.error('[html-preview] upload error:', uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // 10년짜리 signed URL (사실상 영구 접근)
  const { data: signed, error: signedError } = await admin.storage
    .from(bucket)
    .createSignedUrl(storagePath, 315360000);

  if (signedError || !signed?.signedUrl) {
    console.error('[html-preview] signed URL error:', signedError);
    return NextResponse.json({ error: 'URL 생성 실패' }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl, storagePath });
}

export async function DELETE(request: Request) {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!bucket) return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });

  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  let appId: string;
  try {
    const body = await request.json();
    appId = body.appId;
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식' }, { status: 400 });
  }

  if (!appId) return NextResponse.json({ error: 'appId가 필요합니다.' }, { status: 400 });

  const admin = getAdminClient();
  const { error } = await admin.storage
    .from(bucket)
    .remove([`html-preview/${appId}.html`]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
