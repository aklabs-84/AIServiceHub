'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { Course, Enrollment } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, FaQrcode, FaCheck, FaTimes, FaExpand, FaUsers } from 'react-icons/fa';
import { HiAcademicCap } from 'react-icons/hi';

function formatDate(d: Date | null) {
  if (!d) return '미정';
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
}

// QR 코드 풀스크린 모달
function QRModal({ code, title, onClose }: { code: string; title: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // QR 코드 생성 (qrcode 패키지 없이 간단한 텍스트 표시)
    // 실제로는 qrcode 패키지를 사용하지만 여기서는 canvas에 텍스트 렌더링
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = 400;
    canvas.height = 400;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 400, 400);
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(code, 200, 200);

    // qrcode 라이브러리 동적 로드 시도
    import('qrcode').then(QRCode => {
      QRCode.toCanvas(canvas, code, { width: 400, margin: 2, color: { dark: '#1a1a1a', light: '#ffffff' } }).catch(() => {});
    }).catch(() => {
      // qrcode 없으면 텍스트만 표시
    });
  }, [code]);

  const handleFullscreen = () => {
    if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div ref={containerRef} className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-sm w-full mx-4 space-y-4 text-center" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-black text-gray-900 dark:text-white text-sm truncate flex-1 text-left">{title}</h3>
          <div className="flex items-center gap-2">
            <button onClick={handleFullscreen} className="p-2 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors">
              <FaExpand className="text-sm" />
            </button>
            <button onClick={onClose} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              <FaTimes className="text-sm" />
            </button>
          </div>
        </div>
        <canvas ref={canvasRef} className="mx-auto rounded-2xl" style={{ maxWidth: '100%', height: 'auto' }} />
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">오프라인 체크인 코드</p>
          <p className="text-2xl font-black font-mono tracking-widest text-gray-900 dark:text-white">{code}</p>
        </div>
        <p className="text-xs text-gray-400">전체화면 버튼을 눌러 프로젝터에 표시하세요</p>
      </div>
    </div>
  );
}

// 수강 신청 목록 모달
function EnrollmentsModal({ course, token, onClose }: { course: Course; token: string; onClose: () => void }) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetch(`/api/admin/enrollments/pending`, {
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
      showSuccess(`승인 완료! 입장코드: ${entryCode}`);
      setEnrollments(prev => prev.filter(e => e.id !== enrollmentId));
    } finally {
      setApproving(null);
    }
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
    } finally {
      setApproving(null);
    }
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
                      {e.purchaseOrderId && <span className="text-[10px] text-gray-400">💰 유료</span>}
                      <span className="text-[10px] text-gray-400">{new Date(e.createdAt).toLocaleDateString('ko-KR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => approve(e.id)}
                      disabled={approving === e.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-xs font-bold disabled:opacity-50 transition-colors"
                    >
                      <FaCheck className="text-[10px]" /> 승인
                    </button>
                    <button
                      onClick={() => reject(e.id)}
                      disabled={approving === e.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 text-xs font-bold disabled:opacity-50 transition-colors"
                    >
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

// 메인 클래스 관리 패널
export default function ClassManagementPanel() {
  const { session } = useAuth();
  const { showSuccess, showError } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCourse, setQrCourse] = useState<Course | null>(null);
  const [enrollCourse, setEnrollCourse] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch('/api/classes', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const { courses } = await res.json();
        setCourses(courses ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const toggleVisibility = async (course: Course) => {
    if (!session) return;
    setToggling(course.id);
    try {
      const res = await fetch(`/api/classes/${course.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ isPublic: !course.isPublic }),
      });
      if (!res.ok) { showError('변경 실패'); return; }
      setCourses(prev => prev.map(c => c.id === course.id ? { ...c, isPublic: !c.isPublic } : c));
      showSuccess(course.isPublic ? '비공개로 변경됨' : '공개로 변경됨');
    } finally {
      setToggling(null);
    }
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
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400 text-sm">로딩 중...</div>;
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
              {/* 아이콘 */}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center flex-none">
                <HiAcademicCap className="text-white text-xl" />
              </div>

              {/* 내용 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <h4 className="font-black text-sm text-gray-900 dark:text-white truncate">{course.title}</h4>
                  {!course.isPublic && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">비공개</span>}
                  {course.isPaid && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">{course.price.toLocaleString()}원</span>}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400">
                    {course.locationType === 'online' ? '🖥️ 온라인' : course.locationType === 'offline' ? '🏫 오프라인' : '🔀 혼합'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{formatDate(course.scheduleAt)} · {course.durationMinutes}분</p>
                {course.capacity > 0 && (
                  <p className="text-xs text-gray-400">{course.enrollmentCount}/{course.capacity}명</p>
                )}
              </div>

              {/* 액션 버튼들 */}
              <div className="flex items-center gap-1.5 flex-none flex-wrap justify-end">
                {/* QR 코드 (class_code) */}
                {course.classCode && (
                  <button
                    onClick={() => setQrCourse(course)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 text-xs font-bold hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
                    title="오프라인 QR 코드"
                  >
                    <FaQrcode className="text-xs" /> QR
                  </button>
                )}

                {/* 수강 신청 목록 */}
                <button
                  onClick={() => setEnrollCourse(course)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  title="수강 신청 목록"
                >
                  <FaUsers className="text-xs" /> 신청
                </button>

                {/* 공개/비공개 토글 */}
                <button
                  onClick={() => toggleVisibility(course)}
                  disabled={toggling === course.id}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  title={course.isPublic ? '비공개로 변경' : '공개로 변경'}
                >
                  {course.isPublic ? <FaEyeSlash className="text-xs" /> : <FaEye className="text-xs" />}
                </button>

                {/* 수정 */}
                <Link
                  href={`/classes/${course.id}/edit`}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <FaEdit className="text-xs" />
                </Link>

                {/* 삭제 */}
                <button
                  onClick={() => deleteCourse(course.id, course.title)}
                  disabled={deleting === course.id}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                >
                  <FaTrash className="text-xs" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR 모달 */}
      {qrCourse?.classCode && (
        <QRModal code={qrCourse.classCode} title={qrCourse.title} onClose={() => setQrCourse(null)} />
      )}

      {/* 수강 신청 모달 */}
      {enrollCourse && session && (
        <EnrollmentsModal course={enrollCourse} token={session.access_token} onClose={() => setEnrollCourse(null)} />
      )}
    </div>
  );
}
