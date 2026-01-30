
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const ADMIN_EMAIL = 'mosebb@gmail.com';

const hashValue = (value: string) =>
  createHash('sha256').update(value).digest('hex');

async function requireAdmin(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    throw new Error('Unauthorized');
  }
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) throw new Error('Unauthorized');

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin' || user.email === ADMIN_EMAIL;
  if (!isAdmin) {
    throw new Error('Forbidden');
  }
  return user;
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const { data: items, error } = await supabaseAdmin
      .from('one_time_access')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mappedItems = items.map((data: any) => ({
      id: data.id,
      username: data.username || null,
      password: data.password || null,
      createdAt: data.created_at,
      usedAt: data.used_at,
      sessionExpiresAt: data.session_expires_at,
      durationHours: data.duration_hours || null,
    }));

    return NextResponse.json({ items: mappedItems });
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

    const { data, error } = await supabaseAdmin
      .from('one_time_access')
      .insert({
        username,
        password,
        password_hash: hashValue(password),
        duration_hours: durationHours,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      id: data.id,
      username,
      password,
      durationHours,
      createdAt: data.created_at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
