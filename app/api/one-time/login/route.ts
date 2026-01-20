import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { adminDb } from '@/lib/firebaseAdmin';

const COLLECTION = 'oneTimeAccess';

const hashValue = (value: string) =>
  createHash('sha256').update(value).digest('hex');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body || {};
    if (!username || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const snapshot = await adminDb.collection(COLLECTION).where('username', '==', username).limit(1).get();
    if (snapshot.empty) {
      return NextResponse.json({ error: 'No active credentials' }, { status: 404 });
    }

    const docRef = snapshot.docs[0].ref;
    const data = snapshot.docs[0].data() || {};
    if (data.usedAt) {
      return NextResponse.json({ error: 'Credentials already used' }, { status: 410 });
    }

    const isValid = data.username === username && data.passwordHash === hashValue(password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const durationHours = Number(data.durationHours || 0);
    if (!durationHours) {
      return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
    }

    const sessionToken = randomBytes(16).toString('hex');
    const sessionExpiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);
    await docRef.update({
      usedAt: new Date(),
      sessionToken,
      sessionExpiresAt,
    });

    return NextResponse.json({
      token: sessionToken,
      expiresAt: sessionExpiresAt.toISOString(),
    });
  } catch (error) {
    console.error('One-time login error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
