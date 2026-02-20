import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database';

export const runtime = 'nodejs';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'application/xml',
  'text/xml',
  'text/html',
  'application/javascript',
  'text/javascript',
  'application/json',
  'text/json',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const sanitizeFileName = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, '_');

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
  const { name, size, contentType, targetType } = body || {};

  if (!name || typeof name !== 'string' || typeof size !== 'number') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  if (size > MAX_SIZE) {
    return NextResponse.json({ error: 'File is too large (max 10MB).' }, { status: 400 });
  }
  if (contentType && !ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'File type is not allowed.' }, { status: 400 });
  }
  if (!targetType || !['app', 'prompt'].includes(targetType)) {
    return NextResponse.json({ error: 'Invalid targetType' }, { status: 400 });
  }

  const folder = targetType === 'app' ? 'apps' : 'prompts';
  const safeName = sanitizeFileName(name);
  const storagePath = `${folder}/${decoded.uid}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  const admin = getAdminClient();
  const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(storagePath);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message || 'Failed to create signed URL' }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl, storagePath });
}
