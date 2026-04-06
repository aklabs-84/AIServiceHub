import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database/client';
import { getServerClient } from '@/lib/database/server';

// 등록 보상 아이템 목록 (weight 기반 확률)
const REWARD_TABLE = [
  { item_type: 'apple',  weight: 35 },
  { item_type: 'cookie', weight: 30 },
  { item_type: 'snack',  weight: 20 },
  { item_type: 'milk',   weight: 15 },
];

function pickItem() {
  const total = REWARD_TABLE.reduce((s, r) => s + r.weight, 0);
  let rand = Math.random() * total;
  for (const r of REWARD_TABLE) {
    rand -= r.weight;
    if (rand <= 0) return r.item_type;
  }
  return 'apple';
}

/**
 * POST /api/pet-rewards
 * body: { source_type: 'app' | 'prompt', source_id: string }
 *
 * 앱/프롬프트 등록 1건당 랜덤 먹이 1개 지급.
 * reward_logs 로 중복 방지 (같은 source_id 로 두 번 지급 안 됨).
 */
export async function POST(req: NextRequest) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { source_type, source_id } = await req.json();
  if (!source_type || !source_id) {
    return NextResponse.json({ error: 'source_type, source_id required' }, { status: 400 });
  }

  const admin = getAdminClient();

  // 중복 지급 방지
  const { data: existing } = await admin
    .from('reward_logs')
    .select('id')
    .eq('user_id', user.id)
    .eq('source_type', source_type)
    .eq('source_id', source_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ skipped: true, reason: 'already_rewarded' });
  }

  const item_type = pickItem();

  // 인벤토리 upsert (+1)
  const { data: inv } = await admin
    .from('pet_items')
    .select('quantity')
    .eq('user_id', user.id)
    .eq('item_type', item_type)
    .maybeSingle();

  if (inv) {
    await admin
      .from('pet_items')
      .update({ quantity: inv.quantity + 1 })
      .eq('user_id', user.id)
      .eq('item_type', item_type);
  } else {
    await admin
      .from('pet_items')
      .insert({ user_id: user.id, item_type, quantity: 1 });
  }

  // 보상 이력 기록
  await admin.from('reward_logs').insert({
    user_id: user.id,
    source_type,
    source_id,
    item_type,
    quantity: 1,
  });

  return NextResponse.json({ ok: true, item_type, quantity: 1 });
}
