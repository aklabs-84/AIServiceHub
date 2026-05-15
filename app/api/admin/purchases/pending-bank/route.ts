import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database';

export const runtime = 'nodejs';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'mosebb@gmail.com';

async function requireAdmin(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  const admin = getAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user || user.email !== ADMIN_EMAIL) return null;
  return user;
}

// GET /api/admin/purchases/pending-bank
export async function GET(request: Request) {
  const admin_user = await requireAdmin(request);
  if (!admin_user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = getAdminClient();
  const { data, error } = await admin
    .from('purchases')
    .select('id, order_id, amount, depositor_name, product_type, product_id, created_at')
    .eq('status', 'pending_bank')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 상품명 조회 (app/prompt 테이블에서 name 가져오기)
  const list = await Promise.all(
    (data ?? []).map(async (row) => {
      let productName: string | null = null;
      if (row.product_id) {
        const table = row.product_type === 'app' ? 'apps' : 'prompts';
        const { data: product } = await admin
          .from(table)
          .select('name')
          .eq('id', row.product_id)
          .single();
        productName = product?.name ?? null;
      }
      return { ...row, product_name: productName };
    }),
  );

  return NextResponse.json({ list });
}
