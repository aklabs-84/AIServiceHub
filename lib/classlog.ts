// ClassLog(scholar_metric_app) 연동 클라이언트.
// 웹훅 시크릿은 서버에서만 사용 — 절대 클라이언트로 넘기지 않는다.

const CLASSLOG_BASE_URL = process.env.CLASSLOG_BASE_URL;
const WEBHOOK_SECRET = process.env.AISERVICEHUB_WEBHOOK_SECRET;

function assertConfigured() {
  if (!CLASSLOG_BASE_URL || !WEBHOOK_SECRET) {
    throw new Error('CLASSLOG_BASE_URL / AISERVICEHUB_WEBHOOK_SECRET 환경변수가 설정되지 않았습니다.');
  }
}

async function callClasslog(resource: 'class-sync' | 'submission', body: Record<string, unknown>) {
  assertConfigured();
  const res = await fetch(`${CLASSLOG_BASE_URL}/api/ai-service?resource=${resource}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': WEBHOOK_SECRET as string,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `ClassLog ${resource} 호출 실패 (${res.status})`);
  }
  return data;
}

export interface ClassSyncResult {
  ok: true;
  class_id: string;
  entry_code: string;
  join_url: string;
  already_synced: boolean;
}

// 강좌를 ClassLog 클래스로 동기화(생성 또는 기존 클래스 조회)한다.
async function syncClass(params: {
  externalRefId: string;
  teacherEmail: string;
  className: string;
  subject?: string;
  allowSelfSignup?: boolean;
}): Promise<ClassSyncResult> {
  return callClasslog('class-sync', {
    external_ref_id: params.externalRefId,
    teacher_email: params.teacherEmail,
    class_name: params.className,
    subject: params.subject,
    allow_self_signup: params.allowSelfSignup ?? true,
  }) as Promise<ClassSyncResult>;
}

export interface SubmissionResult {
  ok: true;
  result_id: string;
}

// 학생 결과물을 ClassLog student_results에 기록한다.
async function submitResult(params: {
  entryCode: string;
  studentId?: string;
  studentName?: string;
  title: string;
  resultType: 'link' | 'text';
  linkUrl?: string;
  textContent?: string;
}): Promise<SubmissionResult> {
  return callClasslog('submission', {
    entry_code: params.entryCode,
    student_id: params.studentId,
    student_name: params.studentName,
    title: params.title,
    result_type: params.resultType,
    link_url: params.linkUrl,
    text_content: params.textContent,
  }) as Promise<SubmissionResult>;
}

export const classlog = { syncClass, submitResult };
