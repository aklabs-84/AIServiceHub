import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { classlog } from '@/lib/classlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 바이브코딩 스튜디오 진행 현황 프록시. 스튜디오는 CLASS_TOOL_API_KEY류 키만 알면 되고
// ClassLog 웹훅 시크릿은 이 서버만 가진다.
function isAuthorized(request: Request): boolean {
  const key = request.headers.get('x-api-key');
  if (!key) return false;
  const allowedKeys = [
    process.env.CLASS_TOOL_API_KEY,
    process.env.STUDIO_API_KEY,
    process.env.CODECANVAS_API_KEY,
  ].filter(Boolean);
  const given = Buffer.from(key);
  return allowedKeys.some((allowed) => {
    const expected = Buffer.from(allowed as string);
    return expected.length === given.length && timingSafeEqual(expected, given);
  });
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const int = (v: unknown, min: number, max: number) =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max ? (v as number) : undefined;
const pages = (v: unknown) =>
  Array.isArray(v) ? v.filter((n) => Number.isInteger(n) && n >= 0 && n <= 4).slice(0, 5) : [];

// POST: 학생 한 명의 현재 위치 저장
export async function POST(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== 'object') return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const entryCode = str(raw.entryCode, 100);
  const studentId = str(raw.studentId, 100);
  const studentName = str(raw.studentName, 100);
  const page = int(raw.page, 0, 4);
  if (!entryCode || page === undefined || (!studentId && !studentName)) {
    return NextResponse.json({ error: 'entryCode, page, studentId 또는 studentName은 필수입니다' }, { status: 400 });
  }

  try {
    const result = await classlog.reportProgress({
      entry_code: entryCode,
      student_id: studentId || undefined,
      student_name: studentName || undefined,
      team_name: str(raw.teamName, 40) || undefined,
      page,
      page_label: str(raw.pageLabel, 40) || undefined,
      step_no: int(raw.stepNo, 0, 99),
      step_total: int(raw.stepTotal, 0, 99),
      step_label: str(raw.stepLabel, 60) || undefined,
      completed_pages: pages(raw.completedPages),
      submitted_pages: pages(raw.submittedPages),
      done: raw.done === true ? true : undefined,
      online: raw.online !== false,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[api/classlog/progress:post] failed:', (err as Error).message);
    return NextResponse.json({ error: '진행 상황을 저장하지 못했어요.' }, { status: 502 });
  }
}

// GET ?entryCode=... : 교사용 전체 목록 (스튜디오 서버가 교사 비밀번호를 확인한 뒤에만 호출한다)
export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const entryCode = str(new URL(request.url).searchParams.get('entryCode'), 100);
  if (!entryCode) return NextResponse.json({ error: 'entryCode는 필수입니다' }, { status: 400 });
  try {
    const result = await classlog.listProgress(entryCode);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[api/classlog/progress:get] failed:', (err as Error).message);
    return NextResponse.json({ error: '진행 상황을 불러오지 못했어요.' }, { status: 502 });
  }
}
