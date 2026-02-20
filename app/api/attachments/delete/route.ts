import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database';

export const runtime = 'nodejs';

async function requireAuth(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return null;

  const admin = getAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  return { uid: user.id };
}

export async function POST(request: Request) {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!bucket) {
    return NextResponse.json({ error: 'Storage bucket is not configured.' }, { status: 500 });
  }

  const decoded = await requireAuth(request);
  if (!decoded) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { path, targetType } = body || {};

  if (!path || typeof path !== 'string') {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const expectedPrefix = targetType === 'prompt' ? 'prompts/' : 'apps/';
  if (!path.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: 'Invalid path for target type' }, { status: 400 });
  }

  // Verify ownership: path format is {type}/{userId}/{filename}
  const pathParts = path.split('/');
  if (pathParts.length < 3 || pathParts[1] !== decoded.uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = getAdminClient();
  const { error } = await admin.storage.from(bucket).remove([path]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
