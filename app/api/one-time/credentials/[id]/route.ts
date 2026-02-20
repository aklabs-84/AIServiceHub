import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getAdminClient } from '@/lib/database';

const hashValue = (value: string) =>
  createHash('sha256').update(value).digest('hex');

async function requireAdmin(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) throw new Error('Unauthorized');

  const admin = getAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) throw new Error('Unauthorized');

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    throw new Error('Forbidden');
  }
  return user;
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

    const admin = getAdminClient();
    const { error } = await admin
      .from('one_time_access')
      .update({
        username,
        password_hash: hashValue(password),
        duration_hours: durationHours,
      })
      .eq('id', id);

    if (error) throw error;
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

    const admin = getAdminClient();
    const { error } = await admin.from('one_time_access').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
