import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database/client';
import { getServerClient } from '@/lib/database/server';
import { PET_ITEM_MAP, getGrowthStage } from '@/components/room/ASSETS';

// GET /api/pet-items  → 내 인벤토리
export async function GET() {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = getAdminClient();
  const { data, error } = await admin.from('pet_items').select('*').eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/pet-items  → 아이템 사용 (먹이주기)
export async function POST(req: NextRequest) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { pet_id, item_type } = await req.json();
  const itemDef = PET_ITEM_MAP[item_type];
  if (!itemDef) return NextResponse.json({ error: 'Invalid item' }, { status: 400 });

  const admin = getAdminClient();

  // 인벤토리 확인
  const { data: inv } = await admin
    .from('pet_items').select('quantity')
    .eq('user_id', user.id).eq('item_type', item_type).maybeSingle();
  if (!inv || inv.quantity <= 0) {
    return NextResponse.json({ error: '아이템이 없습니다' }, { status: 400 });
  }

  // 현재 펫 스탯
  const { data: pet, error: petErr } = await admin
    .from('pets').select('*').eq('id', pet_id).eq('user_id', user.id).single();
  if (petErr || !pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 });

  const newHunger    = Math.min(100, pet.hunger    + itemDef.hungerUp);
  const newHappiness = Math.min(100, pet.happiness + itemDef.happinessUp);
  const newExp       = pet.exp + itemDef.exp;
  const newLevel     = Math.floor(newExp / 100) + 1;
  const newStage     = getGrowthStage(newExp);

  const [petUp, itemUp] = await Promise.all([
    admin.from('pets').update({
      hunger: newHunger, happiness: newHappiness,
      exp: newExp, level: newLevel, growth_stage: newStage.id,
    }).eq('id', pet_id).eq('user_id', user.id),
    admin.from('pet_items').update({
      quantity: inv.quantity - 1,
    }).eq('user_id', user.id).eq('item_type', item_type),
  ]);

  if (petUp.error)  return NextResponse.json({ error: petUp.error.message  }, { status: 500 });
  if (itemUp.error) return NextResponse.json({ error: itemUp.error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    pet: { hunger: newHunger, happiness: newHappiness, exp: newExp, level: newLevel, growth_stage: newStage.id },
    item_qty: inv.quantity - 1,
  });
}
