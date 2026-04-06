import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database/client';
import { getServerClient } from '@/lib/database/server';
import { PET_TYPES, PET_TYPE_MAP, getGrowthStage } from '@/components/room/ASSETS';

// GET /api/pets?owner_id=xxx
export async function GET(req: NextRequest) {
  const owner_id = req.nextUrl.searchParams.get('owner_id');
  if (!owner_id) return NextResponse.json({ error: 'owner_id required' }, { status: 400 });
  const admin = getAdminClient();
  const [{ data }, { count: appCount }, { count: promptCount }] = await Promise.all([
    admin.from('pets').select('*').eq('user_id', owner_id).order('created_at'),
    admin.from('apps').select('*', { count: 'exact', head: true }).eq('created_by', owner_id),
    admin.from('prompts').select('*', { count: 'exact', head: true }).eq('created_by', owner_id),
  ]);
  const total_posts = (appCount ?? 0) + (promptCount ?? 0);
  return NextResponse.json({ pets: data ?? [], total_posts });
}

// POST /api/pets  → 입양
export async function POST(req: NextRequest) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { pet_type, name } = await req.json();
  const petDef = PET_TYPE_MAP[pet_type];
  if (!petDef) return NextResponse.json({ error: 'Invalid pet type' }, { status: 400 });

  const admin = getAdminClient();
  const isAdmin = user.email === 'mosebb@gmail.com';

  if (!isAdmin) {
    // 게시글 수로 잠금 해제 확인
    const [{ count: appCount }, { count: promptCount }] = await Promise.all([
      admin.from('apps').select('*', { count: 'exact', head: true }).eq('created_by', user.id),
      admin.from('prompts').select('*', { count: 'exact', head: true }).eq('created_by', user.id),
    ]);
    const totalPosts = (appCount ?? 0) + (promptCount ?? 0);
    if (totalPosts < petDef.unlockAt) {
      return NextResponse.json({
        error: `${petDef.label}은 게시글 ${petDef.unlockAt}개가 필요합니다 (현재 ${totalPosts}개)`,
      }, { status: 403 });
    }

    // 펫 슬롯 확인 (최대 4마리)
    const { count: petCount } = await admin
      .from('pets').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    if ((petCount ?? 0) >= 4) {
      return NextResponse.json({ error: '펫 슬롯이 가득 찼습니다 (최대 4마리)' }, { status: 403 });
    }
  }

  const { count: petCount } = await admin
    .from('pets').select('*', { count: 'exact', head: true }).eq('user_id', user.id);

  const { data: pet, error } = await admin.from('pets').insert({
    user_id: user.id,
    pet_type,
    name: name || petDef.label,
    exp: 0, level: 1, hunger: 80, happiness: 70,
    growth_stage: 'baby',
    pos_x: 15 + Math.random() * 70,
    pos_y: 53 + Math.random() * 15,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 첫 펫 입양 시 스타터 아이템 지급
  if ((petCount ?? 0) === 0) {
    await admin.from('pet_items').insert([
      { user_id: user.id, item_type: 'apple',  quantity: 5 },
      { user_id: user.id, item_type: 'snack',  quantity: 3 },
      { user_id: user.id, item_type: 'cookie', quantity: 3 },
      { user_id: user.id, item_type: 'milk',   quantity: 2 },
    ]);
  }

  return NextResponse.json(pet);
}

// PATCH /api/pets  → 스탯 업데이트
export async function PATCH(req: NextRequest) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, pos_x, pos_y, hunger, happiness, exp, name } = body;

  const admin = getAdminClient();
  const updates: Record<string, unknown> = {};
  if (pos_x     !== undefined) updates.pos_x     = pos_x;
  if (pos_y     !== undefined) updates.pos_y     = pos_y;
  if (name      !== undefined) updates.name      = name;
  if (hunger    !== undefined) updates.hunger    = Math.max(0, Math.min(100, hunger));
  if (happiness !== undefined) updates.happiness = Math.max(0, Math.min(100, happiness));
  // exp는 서버에서 현재 값을 읽어 증분만 허용 (임의 값 설정 차단)
  if (exp !== undefined && typeof exp === 'number' && exp > 0) {
    const { data: current } = await admin.from('pets').select('exp').eq('id', id).eq('user_id', user.id).single();
    if (current) {
      const newExp = (current.exp ?? 0) + Math.min(exp, 500); // 1회 최대 500 증분
      updates.exp          = newExp;
      updates.level        = Math.floor(newExp / 100) + 1;
      updates.growth_stage = getGrowthStage(newExp).id;
    }
  }
  const { error } = await admin.from('pets').update(updates).eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/pets?id=xxx  → 분양 보내기
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = getAdminClient();
  const { error } = await admin.from('pets').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
