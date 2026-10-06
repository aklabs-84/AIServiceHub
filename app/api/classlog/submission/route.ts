import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { classlog } from '@/lib/classlog';

export const runtime = 'nodejs';

// 바이브코딩 스튜디오 등 외부 앱이 ClassLog 웹훅 시크릿을 직접 들고 있지 않도록
// AIServiceHub가 대신 호출해주는 프록시. 스튜디오는 STUDIO_API_KEY만 알면 된다.
function isAuthorized(request: Request): boolean {
  const key = request.headers.get('x-api-key');
  if (!key) return false;
  // CLASS_TOOL_API_KEY: 앞으로 만드는 모든 수업 도구 앱이 공유하는 키.
  // STUDIO_API_KEY/CODECANVAS_API_KEY는 이미 배포된 기존 앱과의 하위호환을 위해 유지.
  const allowedKeys = [
    process.env.CLASS_TOOL_API_KEY,
    process.env.STUDIO_API_KEY,
    process.env.CODECANVAS_API_KEY,
  ].filter(Boolean);
  // 응답 시간으로 키를 추측하지 못하도록 일정 시간 비교를 쓴다.
  const given = Buffer.from(key);
  return allowedKeys.some((allowed) => {
    const expected = Buffer.from(allowed as string);
    return expected.length === given.length && timingSafeEqual(expected, given);
  });
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// POST /api/classlog/submission
// body: { entryCode, studentId?, studentName?, title, resultType:'link'|'text', linkUrl?, textContent? }
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  // 문자열만 받고 길이를 제한한다. (키를 가진 쪽이 직접 호출해도 같은 기준 적용)
  const entryCode = str(raw.entryCode, 100);
  const studentId = str(raw.studentId, 100) || undefined;
  const studentName = str(raw.studentName, 100) || undefined;
  const title = str(raw.title, 200);
  const resultType = raw.resultType;
  const linkUrl = str(raw.linkUrl, 2000) || undefined;
  const textContent = str(raw.textContent, 20000) || undefined;

  if (!entryCode || !title || !resultType) {
    return NextResponse.json({ error: 'entryCode, title, resultType은 필수입니다' }, { status: 400 });
  }
  if (resultType !== 'link' && resultType !== 'text') {
    return NextResponse.json({ error: 'resultType은 link 또는 text여야 합니다' }, { status: 400 });
  }
  // javascript: 같은 위험한 주소를 막는다. (선생님이 링크를 눌렀을 때 실행되는 것 방지)
  if (linkUrl && !/^https:\/\//i.test(linkUrl)) {
    return NextResponse.json({ error: '링크는 https:// 로 시작해야 합니다' }, { status: 400 });
  }
  if (!studentId && !studentName) {
    return NextResponse.json({ error: 'studentId 또는 studentName 중 하나는 필수입니다' }, { status: 400 });
  }

  try {
    const result = await classlog.submitResult({
      entryCode,
      studentId,
      studentName,
      title,
      resultType,
      linkUrl,
      textContent,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[api/classlog/submission] failed:', (err as Error).message);
    const message = (err as Error).message || '';
    // 서버 설정 오류는 내부 환경변수 이름을 숨긴다. (ClassLog가 준 안내 문구는 그대로 전달)
    const safe = message.includes('환경변수') ? '제출 서버 설정에 문제가 있어요. 선생님께 알려 주세요.' : message;
    return NextResponse.json({ error: safe }, { status: 502 });
  }
}
