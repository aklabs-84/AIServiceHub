import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database/client';
import { getServerClient } from '@/lib/database/server';

// GET /api/room?owner_id=xxx
export async function GET(req: NextRequest) {
  const owner_id = req.nextUrl.searchParams.get('owner_id');
  if (!owner_id) return NextResponse.json({ error: 'owner_id required' }, { status: 400 });

  const admin = getAdminClient();
  const [{ data: items }, { data: character }] = await Promise.all([
    admin.from('room_items').select('*').eq('user_id', owner_id).order('z_idx'),
    admin.from('room_character').select('*').eq('user_id', owner_id).maybeSingle(),
  ]);

  return NextResponse.json({ items: items ?? [], character: character ?? null });
}

// POST /api/room  → add item
export async function POST(req: NextRequest) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('room_items')
    .insert({ user_id: user.id, asset_id: body.asset_id, pos_x: body.pos_x ?? 50, pos_y: body.pos_y ?? 60, z_idx: body.z_idx ?? 2, item_scale: body.item_scale ?? 1.0, flip_x: body.flip_x ?? false })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH /api/room  → move item
export async function PATCH(req: NextRequest) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, pos_x, pos_y, flip_x, z_idx, item_scale } = await req.json();
  const admin = getAdminClient();
  const { error } = await admin
    .from('room_items')
    .update({
      pos_x, pos_y,
      ...(flip_x !== undefined && { flip_x }),
      ...(z_idx !== undefined && { z_idx }),
      ...(item_scale !== undefined && { item_scale }),
    })
    .eq('id', id).eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/room?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminClient();
  const { error } = await admin.from('room_items').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
