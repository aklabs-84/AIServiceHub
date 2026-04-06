import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database/client';
import { getServerClient } from '@/lib/database/server';

// PATCH /api/room/character  → upsert character config
export async function PATCH(req: NextRequest) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  // 허용 필드만 화이트리스트 추출 (IDOR 방지 — body.user_id 등 임의 필드 차단)
  const { skin, hair, outfit, anim, pos_x, pos_y, room_theme } = body;
  const safePayload: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() };
  if (skin       !== undefined) safePayload.skin       = skin;
  if (hair       !== undefined) safePayload.hair       = hair;
  if (outfit     !== undefined) safePayload.outfit     = outfit;
  if (anim       !== undefined) safePayload.anim       = anim;
  if (pos_x      !== undefined) safePayload.pos_x      = typeof pos_x === 'number' ? Math.max(0, Math.min(100, pos_x)) : undefined;
  if (pos_y      !== undefined) safePayload.pos_y      = typeof pos_y === 'number' ? Math.max(0, Math.min(100, pos_y)) : undefined;
  if (room_theme !== undefined) safePayload.room_theme = room_theme;

  const admin = getAdminClient();
  const { data, error } = await admin
    .from('room_character')
    .upsert(safePayload, { onConflict: 'user_id' })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
