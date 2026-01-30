import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';


export const runtime = 'nodejs';

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
  const path = body?.path;
  if (!path || typeof path !== 'string' || !path.startsWith('apps/')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 60 * 10);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message || 'Failed to sign URL' }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
