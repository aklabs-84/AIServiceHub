import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database';
import { purchases } from '@/lib/database/purchases';

export const runtime = 'nodejs';

async function requireAuth(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  const admin = getAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// GET /api/purchases/my
export async function GET(request: Request) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminClient();
  const myPurchases = await purchases.getMyPurchases(admin, user.id);

  return NextResponse.json({ purchases: myPurchases });
}
