import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database';
import { sendSlack } from '@/lib/slack';

export const runtime = 'nodejs';

async function getAuthUser(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  const admin = getAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// GET /api/class-inquiries?courseId=xxx — 내 문의 조회
export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ inquiry: null });

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('courseId');
  if (!courseId) return NextResponse.json({ error: 'courseId 필요' }, { status: 400 });

  const admin = getAdminClient();
  const { data } = await admin
    .from('class_inquiries')
    .select('*')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ inquiry: data ?? null });
}

// POST /api/class-inquiries — 문의 등록
export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { courseId, organization, contactName, contactEmail, contactPhone, studentCount, message } = body ?? {};

  if (!courseId || !organization?.trim() || !contactName?.trim() || !contactEmail?.trim() || !message?.trim()) {
    return NextResponse.json({ error: '필수 항목을 모두 입력해 주세요' }, { status: 400 });
  }

  const admin = getAdminClient();

  // 클래스 정보 조회
  const { data: course } = await admin
    .from('education_courses')
    .select('title')
    .eq('id', courseId)
    .single();

  // 기존 활성 문의 확인 (중복 방지)
  const { data: existing } = await admin
    .from('class_inquiries')
    .select('id')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .neq('status', 'cancelled')
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: '이미 이 클래스에 문의를 남기셨습니다. 수정하거나 취소 후 재신청하세요.' }, { status: 409 });
  }

  const { data, error } = await admin
    .from('class_inquiries')
    .insert({
      course_id: courseId,
      user_id: user.id,
      organization: organization.trim(),
      contact_name: contactName.trim(),
      contact_email: contactEmail.trim(),
      contact_phone: contactPhone?.trim() || null,
      student_count: studentCount ? parseInt(studentCount) : null,
      message: message.trim(),
      status: 'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Slack 알림
  await sendSlack(
    `🏫 클래스 수업 신청 문의\n• 클래스: ${course?.title ?? courseId}\n• 기관: ${organization.trim()}\n• 담당자: ${contactName.trim()}\n• 이메일: ${contactEmail.trim()}${contactPhone ? `\n• 연락처: ${contactPhone.trim()}` : ''}${studentCount ? `\n• 예상 학생 수: ${studentCount}명` : ''}\n• 문의 내용:\n${message.trim()}`
  ).catch(() => {});

  return NextResponse.json({ inquiry: data }, { status: 201 });
}
