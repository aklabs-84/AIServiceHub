import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { adminDb, verifyFirebaseIdToken } from '@/lib/firebaseAdmin';

const ADMIN_EMAIL = 'mosebb@gmail.com';
const COLLECTION = 'oneTimeAccess';

const hashValue = (value: string) =>
  createHash('sha256').update(value).digest('hex');

async function requireAdmin(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    throw new Error('Unauthorized');
  }
  const decoded = await verifyFirebaseIdToken(token);
  if (decoded.email !== ADMIN_EMAIL) {
    throw new Error('Forbidden');
  }
  return decoded;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const { username, password, durationHours } = body || {};
    if (!username || !password || !durationHours) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    await adminDb.collection(COLLECTION).doc(id).update({
      username,
      password,
      passwordHash: hashValue(password),
      durationHours,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    await adminDb.collection(COLLECTION).doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
