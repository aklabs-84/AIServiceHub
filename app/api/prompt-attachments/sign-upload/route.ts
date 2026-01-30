import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';


export const runtime = 'nodejs';

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = [
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

const requireAuth = async (request: Request) => {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return null;
  }
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return { uid: user.id };
};

const bucket = process.env.SUPABASE_STORAGE_BUCKET;

export async function POST(request: Request) {
  if (!bucket) {
    return NextResponse.json({ error: 'Storage bucket is not configured.' }, { status: 500 });
  }

  const decoded = await requireAuth(request);
  if (!decoded) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = body?.name;
  const size = body?.size;
  const contentType = body?.contentType;

  if (!name || typeof name !== 'string' || typeof size !== 'number') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  if (size > MAX_ATTACHMENT_SIZE_BYTES) {
    return NextResponse.json({ error: 'File is too large.' }, { status: 400 });
  }
  if (contentType && !ALLOWED_ATTACHMENT_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'File type is not allowed.' }, { status: 400 });
  }

  const safeName = sanitizeFileName(name || 'file');
  const storagePath = `prompts/${decoded.uid}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(storagePath);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message || 'Failed to create signed URL' }, { status: 500 });
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    storagePath,
  });
}
