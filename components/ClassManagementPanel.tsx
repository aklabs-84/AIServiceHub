'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import type { Course, Enrollment } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, FaQrcode, FaCheck, FaTimes, FaExpand, FaUsers, FaDoorOpen, FaExternalLinkAlt } from 'react-icons/fa';
import { HiAcademicCap } from 'react-icons/hi';

function toDate(d: Date | string): Date {
  if (d instanceof Date) return d;
  return new Date(d);
}

function formatDate(d: Date | string): string {
  const date = toDate(d);
  if (isNaN(date.getTime())) return '날짜 오류';
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

function courseTypeLabel(type: string) {
  if (type === 'online') return '🖥️ 온라인';
  if (type === 'offline') return '🏫 오프라인';
  return '🔀 혼합';
}

// ── QR 모달 ────────────────────────────────────────────────────────────────
// QR 코드: 교실 URL 인코딩 (스캔 → 교실 바로 이동)
// 입장 코드는 수강 승인 후 개인별 발급 — QR 모달에는 코드 없음
function QRModal({ courseId, title, onClose }: { courseId: string; title: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [classroomUrl, setClassroomUrl] = useState('');

  useEffect(() => {
    const url = `${window.location.origin}/classes/${courseId}/classroom`;
    setClassroomUrl(url);

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Fallback 텍스트
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 300;
      canvas.height = 300;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 300, 300);
      ctx.fillStyle = '#7c3aed';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('교실 QR 로딩 중...', 150, 150);
    }

    // qrcode 라이브러리 동적 로드
    import('qrcode').then(QRCode => {
      QRCode.toCanvas(canvas, url, {
        width: 300,
        margin: 2,
        color: { dark: '#1a1a1a', light: '#ffffff' },
      }).catch(() => {});
    }).catch(() => {});
  }, [courseId]);

  const handleFullscreen = () => {
    containerRef.current?.requestFullscreen?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div ref={containerRef} className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-sm w-full mx-4 space-y-4 text-center" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-black text-gray-900 dark:text-white text-sm truncate flex-1 text-left">{title}</h3>
          <div className="flex items-center gap-2">
            <button onClick={handleFullscreen} className="p-2 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 hover:bg-violet-100 transition-colors" title="프로젝터 전체화면">
              <FaExpand className="text-sm" />
            </button>
            <button onClick={onClose} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              <FaTimes className="text-sm" />
            </button>
          </div>
        </div>

        {/* QR 코드 */}
        <canvas ref={canvasRef} className="mx-auto rounded-2xl" style={{ maxWidth: '100%', height: 'auto' }} />

        {/* 교실 URL */}
        <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800">
          <p className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-1">교실 URL</p>
          <p className="text-[11px] font-mono text-violet-700 dark:text-violet-300 break-all">{classroomUrl}</p>
        </div>

        {/* 안내 */}
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-left">
          <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
            📌 입장 코드는 수강 승인 후 개인별 발급됩니다.<br />
            수강생이 QR 스캔 후 본인의 입장 코드를 입력하면 교실에 입장합니다.
          </p>
        </div>

        <p className="text-xs text-gray-400">↗ 전체화면 버튼으로 프로젝터에 표시</p>
      </div>
    </div>
  );
}

// ── 수강 신청 목록 모달 ─────────────────────────────────────────────────────
function EnrollmentsModal({ course, token, onClose }: { course: Course; token: string; onClose: () => void }) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetch('/api/admin/enrollments/pending', {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(d => {
      setEnrollments((d.enrollments ?? []).filter((e: Enrollment) => e.courseId === course.id));
    }).finally(() => setLoading(false));
  }, [course.id, token]);

  const approve = async (enrollmentId: string) => {
    setApproving(enrollmentId);
    try {
      const res = await fetch('/api/admin/enrollments/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enrollmentId }),
      });
      if (!res.ok) { showError('승인 실패'); return; }
      const { entryCode } = await res.json();
      showSuccess(`✅ 승인 완료! 입장코드: ${entryCode}`);
      setEnrollments(prev => prev.filter(e => e.id !== enrollmentId));
    } finally { setApproving(null); }
  };

  const reject = async (enrollmentId: string) => {
    if (!confirm('수강 신청을 취소하시겠습니까?')) return;
    setApproving(enrollmentId);
    try {
      const res = await fetch('/api/admin/enrollments/approve', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enrollmentId }),
      });
      if (!res.ok) { showError('취소 실패'); return; }
      showSuccess('취소 처리됨');
      setEnrollments(prev => prev.filter(e => e.id !== enrollmentId));
    } finally { setApproving(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="font-black text-gray-900 dark:text-white">{course.title}</h3>
            <p className="text-xs text-gray-500">수강 신청 대기 목록</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"><FaTimes /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">로딩 중...</div>
          ) : enrollments.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">대기 중인 신청이 없습니다</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {enrollments.map(e => (
                <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{e.userName || '(이름 없음)'}</p>
                    <p className="text-xs text-gray-500 truncate">{e.userEmail}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${e.status === 'waitlist' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                        {e.status === 'waitlist' ? '대기' : '신청'}
                      </span>
                      {e.courseIsPaid && <span className="text-[10px] text-gray-400">💰 유료</span>}
                      <span className="text-[10px] text-gray-400">{new Date(e.createdAt).toLocaleDateString('ko-KR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => approve(e.id)} disabled={approving === e.id} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-xs font-bold disabled:opacity-50 transition-colors">
                      <FaCheck className="text-[10px]" /> 승인
                    </button>
                    <button onClick={() => reject(e.id)} disabled={approving === e.id} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 text-xs font-bold disabled:opacity-50 transition-colors">
                      <FaTimes className="text-[10px]" /> 거절
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 메인 패널 ───────────────────────────────────────────────────────────────
export default function ClassManagementPanel() {
  const { session } = useAuth();
  const { showSuccess, showError } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [qrTarget, setQrTarget] = useState<{ courseId: string; title: string } | null>(null);
  const [enrollCourse, setEnrollCourse] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/classes', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const { courses: raw } = await res.json();
        // JSON 파싱 시 Date가 string으로 오므로 Date 객체로 변환
        const parsed = (raw ?? []).map((c: Course) => ({
          ...c,
          startAt: new Date(c.startAt as unknown as string),
          endAt: new Date(c.endAt as unknown as string),
          createdAt: new Date(c.createdAt as unknown as string),
          updatedAt: new Date(c.updatedAt as unknown as string),
        }));
        setCourses(parsed);
      } else {
        const d = await res.json().catch(() => ({}));
        setLoadError(`클래스 목록 로드 실패 (${res.status}): ${d.error || '알 수 없는 오류'}`);
      }
    } catch (e) {
      setLoadError('네트워크 오류로 클래스를 불러올 수 없습니다');
    } finally { setLoading(false); }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const togglePublish = async (course: Course) => {
    if (!session) return;
    setToggling(course.id);
    try {
      const res = await fetch(`/api/classes/${course.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ isPublished: !course.isPublished }),
      });
      if (!res.ok) { showError('변경 실패'); return; }
      setCourses(prev => prev.map(c => c.id === course.id ? { ...c, isPublished: !c.isPublished } : c));
      showSuccess(course.isPublished ? '비공개로 변경됨' : '공개로 변경됨');
    } finally { setToggling(null); }
  };

  const deleteCourse = async (id: string, title: string) => {
    if (!session || !confirm(`"${title}" 클래스를 삭제하시겠습니까? 모든 수강 신청도 삭제됩니다.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/classes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) { showError('삭제 실패'); return; }
      setCourses(prev => prev.filter(c => c.id !== id));
      showSuccess('삭제되었습니다');
    } finally { setDeleting(null); }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400 text-sm">로딩 중...</div>;
  }

  if (loadError) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm font-bold text-red-500">{loadError}</p>
        <button onClick={load} className="text-xs font-bold text-violet-600 hover:underline">다시 시도</button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2">
          <HiAcademicCap className="text-violet-600" /> 클래스 관리
          <span className="text-xs font-bold text-gray-400">({courses.length}개)</span>
        </h3>
        <Link href="/classes/new" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-black hover:bg-violet-700 transition-colors">
          <FaPlus className="text-[10px]" /> 새 클래스
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          <HiAcademicCap className="text-5xl mx-auto mb-3 opacity-30" />
          <p className="text-sm font-bold">등록된 클래스가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map(course => (
            <div key={course.id} className="flex items-start gap-3 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-violet-200 dark:hover:border-violet-800 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center flex-none">
                <HiAcademicCap className="text-white text-xl" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <h4 className="font-black text-sm text-gray-900 dark:text-white">{course.title}</h4>
                  {!course.isPublished && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">비공개</span>}
                  {course.isPaid && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">{course.price.toLocaleString()}원</span>}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400">
                    {courseTypeLabel(course.courseType)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{formatDate(course.startAt)} ~ {formatDate(course.endAt)}</p>
                {course.location && <p className="text-xs text-gray-400">{course.location}</p>}
                {course.maxParticipants && <p className="text-xs text-gray-400">정원 {course.maxParticipants}명</p>}
              </div>

              <div className="flex items-center gap-1.5 flex-none flex-wrap justify-end">
                {/* QR — 교실 URL 표시 */}
                <button
                  onClick={() => setQrTarget({ courseId: course.id, title: course.title })}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 text-xs font-bold hover:bg-violet-100 transition-colors"
                  title="QR 코드 표시"
                >
                  <FaQrcode className="text-xs" /> QR
                </button>

                {/* 교실 입장 — 직접 이동 */}
                <Link
                  href={`/classes/${course.id}/classroom`}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-100 transition-colors"
                  title="교실 입장 페이지로 이동"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaDoorOpen className="text-xs" /> 교실
                </Link>

                {/* 수강 신청 목록 */}
                <button
                  onClick={() => setEnrollCourse(course)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 transition-colors"
                >
                  <FaUsers className="text-xs" /> 신청
                </button>

                {/* 공개/비공개 토글 */}
                <button
                  onClick={() => togglePublish(course)}
                  disabled={toggling === course.id}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  title={course.isPublished ? '비공개로 변경' : '공개로 변경'}
                >
                  {course.isPublished ? <FaEyeSlash className="text-xs" /> : <FaEye className="text-xs" />}
                </button>

                {/* 수정 */}
                <Link href={`/classes/${course.id}/edit`} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <FaEdit className="text-xs" />
                </Link>

                {/* 삭제 */}
                <button
                  onClick={() => deleteCourse(course.id, course.title)}
                  disabled={deleting === course.id}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 text-xs font-bold hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                  <FaTrash className="text-xs" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR 모달 */}
      {qrTarget && (
        <QRModal courseId={qrTarget.courseId} title={qrTarget.title} onClose={() => setQrTarget(null)} />
      )}

      {/* 수강 신청 모달 */}
      {enrollCourse && session && (
        <EnrollmentsModal course={enrollCourse} token={session.access_token} onClose={() => setEnrollCourse(null)} />
      )}
    </div>
  );
}
