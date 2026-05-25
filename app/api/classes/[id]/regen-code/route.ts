import { NextResponse } from 'next/server';
import { getAdminClient, db } from '@/lib/database';

export const runtime = 'nodejs';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'mosebb@gmail.com';

// POST /api/classes/[id]/regen-code — 클래스 단일 입장코드 재생성 (관리자 전용)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const code = await db.education.setClassEntryCode(admin, id);
    return NextResponse.json({ classEntryCode: code });
  } catch (e) {
    return NextResponse.json({ error: '코드 생성 실패' }, { status: 500 });
  }
}
