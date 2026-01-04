import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyFirebaseIdToken } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

const sanitizeFileName = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, '_');
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

const requireAuth = async (request: Request) => {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return null;
  }
  return verifyFirebaseIdToken(token);
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

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File is required.' }, { status: 400 });
  }
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return NextResponse.json({ error: 'File is too large.' }, { status: 400 });
  }
  if (file.type && !ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'File type is not allowed.' }, { status: 400 });
  }

  const safeName = sanitizeFileName(file.name || 'file');
  const storagePath = `prompts/${decoded.uid}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage.from(bucket).upload(storagePath, fileBuffer, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    attachment: {
      name: file.name || safeName,
      size: file.size,
      contentType: file.type || 'application/octet-stream',
      storagePath,
    },
  });
}
