import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database';

export const runtime = 'nodejs';
export const maxDuration = 60;

// 안 쓰는 썸네일 정리 (한 달에 한 번, Vercel Cron)
// - 대상: thumbnails/ 폴더만 (블로그 본문 사진이 있는 posts/ 는 절대 건드리지 않음)
// - 조건: 앱·프롬프트·교육과정의 thumbnail_url 에서 쓰이지 않고, 올린 지 7일이 지난 파일
// - 기본은 "연습 모드"(목록만 반환). 환경변수 THUMBNAIL_CLEANUP_APPLY=true 일 때만 실제 삭제
// - ?dryRun=1 을 붙이면 환경변수와 상관없이 항상 연습 모드
const PROTECT_DAYS = 7;
const MAX_DELETE_PER_RUN = 500;
const THUMB_TABLES = ['apps', 'prompts', 'education_courses'] as const;

// 서명된 주소에서 저장소 경로(thumbnails/…)만 뽑는다
function extractPath(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/\/(thumbnails\/[^?]+)/);
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return m[1]; }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!bucket) return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });

  const url = new URL(request.url);
  const apply = process.env.THUMBNAIL_CLEANUP_APPLY === 'true' && url.searchParams.get('dryRun') !== '1';
  const admin = getAdminClient();

  // 1) 지금 쓰이는 썸네일 경로 모으기 (하나라도 실패하면 아무것도 지우지 않고 멈춤)
  const used = new Set<string>();
  for (const table of THUMB_TABLES) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin
        .from(table)
        .select('thumbnail_url')
        .not('thumbnail_url', 'is', null)
        .range(from, from + 999);
      if (error) return NextResponse.json({ error: `${table} 조회 실패: ${error.message}` }, { status: 500 });
      for (const row of data || []) {
        const p = extractPath((row as { thumbnail_url: string | null }).thumbnail_url);
        if (p) used.add(p);
      }
      if (!data || data.length < 1000) break;
    }
  }

  // 2) 저장소 thumbnails/{userId}/ 파일 목록
  const storage = admin.storage.from(bucket);
  const { data: folders, error: listErr } = await storage.list('thumbnails', { limit: 1000 });
  if (listErr) return NextResponse.json({ error: `목록 조회 실패: ${listErr.message}` }, { status: 500 });

  const cutoff = Date.now() - PROTECT_DAYS * 24 * 60 * 60 * 1000;
  let total = 0;
  const orphans: string[] = [];
  for (const folder of folders || []) {
    for (let offset = 0; ; offset += 1000) {
      const { data: files, error } = await storage.list(`thumbnails/${folder.name}`, { limit: 1000, offset });
      if (error) return NextResponse.json({ error: `목록 조회 실패: ${error.message}` }, { status: 500 });
      for (const f of files || []) {
        if (!f.id) continue; // 폴더 항목 건너뜀
        total += 1;
        const path = `thumbnails/${folder.name}/${f.name}`;
        const created = f.created_at ? new Date(f.created_at).getTime() : Date.now();
        if (!used.has(path) && created < cutoff) orphans.push(path);
      }
      if (!files || files.length < 1000) break;
    }
  }

  // 안전장치: 쓰이는 주소가 하나도 없는데 파일이 있으면 DB 조회 이상으로 보고 멈춤
  if (total > 0 && used.size === 0) {
    return NextResponse.json({ error: '사용 중 목록이 비어 있어 중단했습니다 (삭제 없음)', total }, { status: 409 });
  }

  const targets = orphans.slice(0, MAX_DELETE_PER_RUN);
  let deleted = 0;
  if (apply) {
    for (let i = 0; i < targets.length; i += 100) {
      const { error } = await storage.remove(targets.slice(i, i + 100));
      if (error) return NextResponse.json({ error: `삭제 실패: ${error.message}`, deleted }, { status: 500 });
      deleted += Math.min(100, targets.length - i);
    }
  }

  const result = { mode: apply ? 'apply' : 'dry-run', total, inUse: used.size, orphans: orphans.length, deleted, targets: apply ? undefined : targets };
  console.log('[cleanup-thumbnails]', JSON.stringify({ ...result, targets: undefined }));
  return NextResponse.json(result);
}
