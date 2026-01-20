import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { adminDb, verifyFirebaseIdToken } from '@/lib/firebaseAdmin';

const ADMIN_EMAIL = 'mosebb@gmail.com';
const COLLECTION = 'oneTimeAccess';

const hashValue = (value: string) =>
  createHash('sha256').update(value).digest('hex');

const toIso = (value?: { toDate: () => Date } | null) => {
  if (!value) return null;
  return value.toDate().toISOString();
};

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

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const snapshot = await adminDb.collection(COLLECTION).orderBy('createdAt', 'desc').get();
    const items = snapshot.docs.map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        username: data.username || null,
        password: data.password || null,
        createdAt: toIso(data.createdAt),
        usedAt: toIso(data.usedAt),
        sessionExpiresAt: toIso(data.sessionExpiresAt),
        durationHours: data.durationHours || null,
      };
    });
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const { username, password, durationHours } = body || {};
    if (!username || !password || !durationHours) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    const docRef = await adminDb.collection(COLLECTION).add({
      username,
      password,
      passwordHash: hashValue(password),
      durationHours,
      createdAt: new Date(),
      usedAt: null,
      sessionToken: null,
      sessionExpiresAt: null,
    });
    return NextResponse.json({
      id: docRef.id,
      username,
      password,
      durationHours,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
