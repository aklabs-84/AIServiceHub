import { NextResponse } from 'next/server';
import { classlog } from '@/lib/classlog';

export const runtime = 'nodejs';

// 바이브코딩 스튜디오 등 외부 앱이 ClassLog 웹훅 시크릿을 직접 들고 있지 않도록
// AIServiceHub가 대신 호출해주는 프록시. 스튜디오는 STUDIO_API_KEY만 알면 된다.
function isAuthorized(request: Request): boolean {
  const key = request.headers.get('x-api-key');
  if (!key) return false;
  const allowedKeys = [process.env.STUDIO_API_KEY, process.env.CODECANVAS_API_KEY].filter(Boolean);
  return allowedKeys.includes(key);
}

// POST /api/classlog/submission
// body: { entryCode, studentId?, studentName?, title, resultType:'link'|'text', linkUrl?, textContent? }
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { entryCode, studentId, studentName, title, resultType, linkUrl, textContent } = body ?? {};

  if (!entryCode || !title || !resultType) {
    return NextResponse.json({ error: 'entryCode, title, resultType은 필수입니다' }, { status: 400 });
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
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
