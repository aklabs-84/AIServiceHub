import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database';
import { sendSlack } from '@/lib/slack';
import { sendAdminPush } from '@/lib/push';

export const runtime = 'nodejs';

async function getAuthUser(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  const admin = getAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// PATCH /api/class-inquiries/[id] — 문의 수정
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { organization, contactName, contactEmail, contactPhone, studentCount, message } = body ?? {};

  if (!organization?.trim() || !contactName?.trim() || !contactEmail?.trim() || !message?.trim()) {
    return NextResponse.json({ error: '필수 항목을 모두 입력해 주세요' }, { status: 400 });
  }

  const admin = getAdminClient();

  // 본인 문의인지 확인
  const { data: existing } = await admin
    .from('class_inquiries')
    .select('id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: '문의를 찾을 수 없습니다' }, { status: 404 });
  if (existing.status === 'cancelled') return NextResponse.json({ error: '취소된 문의는 수정할 수 없습니다' }, { status: 400 });
  if (existing.status === 'replied') return NextResponse.json({ error: '답변 완료된 문의는 수정할 수 없습니다' }, { status: 400 });

  const { data, error } = await admin
    .from('class_inquiries')
    .update({
      organization: organization.trim(),
      contact_name: contactName.trim(),
      contact_email: contactEmail.trim(),
      contact_phone: contactPhone?.trim() || null,
      student_count: studentCount ? parseInt(studentCount) : null,
      message: message.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inquiry: data });
}

// DELETE /api/class-inquiries/[id] — 문의 취소
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminClient();

  const { data: existing } = await admin
    .from('class_inquiries')
    .select('id, status, organization, contact_name, course_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: '문의를 찾을 수 없습니다' }, { status: 404 });
  if (existing.status === 'cancelled') return NextResponse.json({ error: '이미 취소된 문의입니다' }, { status: 400 });

  const { error } = await admin
    .from('class_inquiries')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 클래스 제목 조회
  const { data: course } = await admin
    .from('education_courses')
    .select('title')
    .eq('id', existing.course_id)
    .single();

  await sendSlack(
    `❌ 클래스 수업 문의 취소\n• 클래스: ${course?.title ?? existing.course_id}\n• 기관: ${existing.organization}\n• 담당자: ${existing.contact_name}`
  ).catch(() => {});
  await sendAdminPush({
    title: '❌ 클래스 문의 취소',
    body: `${course?.title ?? ''} | ${existing.organization} | ${existing.contact_name}`,
    url: '/admin?tab=inquiries',
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
