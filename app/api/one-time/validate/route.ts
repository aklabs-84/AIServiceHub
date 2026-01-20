import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

const COLLECTION = 'oneTimeAccess';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body || {};
    if (!token) {
      return NextResponse.json({ active: false });
    }

    const snapshot = await adminDb.collection(COLLECTION).where('sessionToken', '==', token).limit(1).get();
    if (snapshot.empty) {
      return NextResponse.json({ active: false });
    }

    const data = snapshot.docs[0].data() || {};

    const expiresAt = data.sessionExpiresAt?.toDate?.();
    if (!expiresAt || expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ active: false });
    }

    return NextResponse.json({ active: true, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    console.error('One-time validate error:', error);
    return NextResponse.json({ active: false });
  }
}
