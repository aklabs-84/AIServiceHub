import { NextResponse } from 'next/server';
import { getAdminClient, db } from '@/lib/database';
import { classlog } from '@/lib/classlog';

export const runtime = 'nodejs';

// POST /api/apps/[id]/submit-result
// AIServiceHub가 직접 서빙하는 HTML 앱(예: html-preview) 전용 제출 라우트.
// 이 앱들은 같은 origin에서 실행되므로 CLASS_TOOL_API_KEY 같은 공유 비밀키를
// 클라이언트 JS에 둘 수 없다 — 대신 이 서버 라우트가 그 자리를 대신하며,
// 실제 인가는 entryCode 자체를 ClassLog가 검증하는 것으로 이루어진다.
// body: { entryCode, studentId?, studentName?, title, resultType:'link'|'text', linkUrl?, textContent? }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: appId } = await params;

  const body = await request.json().catch(() => null);
  const { entryCode, studentId, studentName, title, resultType, linkUrl, textContent } = body ?? {};

  if (!entryCode || !title || !resultType) {
    return NextResponse.json({ error: 'entryCode, title, resultType은 필수입니다' }, { status: 400 });
  }
  if (!studentId && !studentName) {
    return NextResponse.json({ error: 'studentId 또는 studentName 중 하나는 필수입니다' }, { status: 400 });
  }

  const admin = getAdminClient();
  const app = await db.apps.getById(admin, appId);
  if (!app || !app.isPublic) {
    return NextResponse.json({ error: '앱을 찾을 수 없습니다' }, { status: 404 });
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
    console.error('[api/apps/submit-result] failed:', (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
