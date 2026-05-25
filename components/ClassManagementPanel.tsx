'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import type { Course, Enrollment } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, FaQrcode, FaCheck, FaTimes, FaExpand, FaUsers, FaDoorOpen, FaSync, FaUserCheck, FaUserPlus, FaUserMinus } from 'react-icons/fa';
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
function QRModal({ courseId, title, classEntryCode: initialClassEntryCode, token, onClose, onCodeRegenerated }: {
  courseId: string;
  title: string;
  classEntryCode?: string | null;
  token: string;
  onClose: () => void;
  onCodeRegenerated?: (code: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [classroomUrl, setClassroomUrl] = useState('');
  const [confirmedList, setConfirmedList] = useState<Enrollment[]>([]);
  const [showCodes, setShowCodes] = useState(false);
  const [classEntryCode, setClassEntryCode] = useState<string | null | undefined>(initialClassEntryCode);
  const [regenerating, setRegenerating] = useState(false);

  // QR 생성
  useEffect(() => {
    const url = `${window.location.origin}/classes/${courseId}/classroom`;
    setClassroomUrl(url);

    const canvas = canvasRef.current;
    if (!canvas) return;

    import('qrcode').then(QRCode => {
      QRCode.toCanvas(canvas, url, {
        width: 400,
        margin: 2,
        color: { dark: '#1a1a1a', light: '#ffffff' },
      }).catch(() => {});
    }).catch(() => {});
  }, [courseId]);

  // 확정 수강생 입장코드 로드
  useEffect(() => {
    if (!showCodes) return;
    fetch(`/api/admin/enrollments?courseId=${courseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        const confirmed = (d.enrollments ?? []).filter((e: Enrollment) => e.status === 'confirmed' && e.entryCode);
        setConfirmedList(confirmed);
      })
      .catch(() => {});
  }, [showCodes, courseId, token]);

  const regenCode = async () => {
    if (!confirm(classEntryCode ? '입장 코드를 재생성하면 기존 코드는 더 이상 사용할 수 없습니다. 계속하시겠습니까?' : '클래스 단일 입장코드를 생성합니다.')) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/classes/${courseId}/regen-code`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { alert('코드 생성 실패'); return; }
      const { classEntryCode: newCode } = await res.json();
      setClassEntryCode(newCode);
      onCodeRegenerated?.(newCode);
    } finally { setRegenerating(false); }
  };

  const handleFullscreen = () => {
    containerRef.current?.requestFullscreen?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
      onClick={onClose}
    >
      {/* 전체화면 시 흰 배경으로 프로젝터 대응 */}
      <div
        ref={containerRef}
        className="bg-white dark:bg-gray-950 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800 flex-none">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-0.5">교실 입장 QR</p>
            <h3 className="font-black text-gray-900 dark:text-white text-sm truncate">{title}</h3>
          </div>
          <div className="flex items-center gap-2 flex-none ml-3">
            <button
              onClick={handleFullscreen}
              className="p-2 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
              title="프로젝터 전체화면"
            >
              <FaExpand />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* 스크롤 영역 */}
        <div className="overflow-y-auto flex-1">
          {/* QR 코드 — 크고 중앙 */}
          <div className="flex flex-col items-center justify-center px-6 py-8 bg-white dark:bg-gray-950">
            <canvas
              ref={canvasRef}
              className="rounded-2xl shadow-lg"
              style={{ width: '100%', maxWidth: '400px', height: 'auto' }}
            />
          </div>

          {/* 클래스 단일 입장코드 — 오프라인 공용 코드 */}
          <div className="px-6 pb-2 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">클래스 입장 코드 (전원 공용)</p>
            {classEntryCode ? (
              <div className="flex flex-col items-center gap-3">
                <div className="px-6 py-4 rounded-2xl bg-violet-50 dark:bg-violet-900/30 border-2 border-violet-200 dark:border-violet-700">
                  <span className="text-4xl font-black font-mono tracking-widest text-violet-700 dark:text-violet-300 select-all">
                    {classEntryCode}
                  </span>
                </div>
                <button
                  onClick={regenCode}
                  disabled={regenerating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold disabled:opacity-50 transition-colors"
                >
                  <FaSync className={`text-[10px] ${regenerating ? 'animate-spin' : ''}`} />
                  {regenerating ? '생성 중...' : '코드 재생성'}
                </button>
              </div>
            ) : (
              <button
                onClick={regenCode}
                disabled={regenerating}
                className="px-5 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-black transition-colors"
              >
                {regenerating ? '생성 중...' : '+ 입장 코드 생성'}
              </button>
            )}
          </div>

          {/* 교실 URL */}
          <div className="px-6 pb-4">
            <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-violet-400 mb-1">교실 URL (직접 입력)</p>
              <p className="text-sm font-mono font-bold text-violet-700 dark:text-violet-300 break-all leading-relaxed">
                {classroomUrl}
              </p>
            </div>
          </div>

          {/* 확정 수강생 입장 코드 */}
          <div className="px-6 pb-6">
            <button
              onClick={() => setShowCodes(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="text-sm font-black text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <FaUsers className="text-violet-500" />
                수강 확정 학생 입장 코드 보기
              </span>
              <span className="text-xs text-gray-400">{showCodes ? '▲ 숨기기' : '▼ 펼치기'}</span>
            </button>

            {showCodes && (
              <div className="mt-2 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                {confirmedList.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-400 font-bold">확정된 수강생이 없습니다</p>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {confirmedList.map(e => (
                      <div key={e.id} className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">
                            {e.userName || '(이름 없음)'}
                          </p>
                          <p className="text-xs text-gray-400 truncate">{e.userEmail}</p>
                        </div>
                        <div className="ml-3 flex-none">
                          <span className="px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800 font-mono font-black text-sm text-violet-700 dark:text-violet-300 tracking-widest">
                            {e.entryCode}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 확정 학생 목록 모달 ────────────────────────────────────────────────────
function StudentsModal({ course, token, onClose }: { course: Course; token: string; onClose: () => void }) {
  const [students, setStudents] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addName, setAddName] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  // 자동완성
  const [suggestions, setSuggestions] = useState<{ id: string; email: string; displayName: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showError } = useToast();

  const load = () => {
    setLoading(true);
    fetch(`/api/admin/enrollments?courseId=${course.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        setStudents((d.enrollments ?? []).filter((e: Enrollment) => e.status === 'confirmed'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [course.id, token]);

  // 이메일 입력 시 자동완성 검색 (300ms 디바운스)
  const handleEmailChange = (value: string) => {
    setAddEmail(value);
    setAddError('');
    if (searchTimer) clearTimeout(searchTimer);
    if (value.trim().length < 1) { setSuggestions([]); setShowSuggestions(false); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(value.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const { users } = await res.json();
          setSuggestions(users ?? []);
          setShowSuggestions(true);
        }
      } catch { /* silent */ }
    }, 300);
    setSearchTimer(timer);
  };

  const selectSuggestion = (user: { email: string; displayName: string }) => {
    setAddEmail(user.email);
    if (!addName) setAddName(user.displayName);
    setSuggestions([]);
    setShowSuggestions(false);
    emailInputRef.current?.blur();
  };

  const removeStudent = async (enrollmentId: string, name: string) => {
    if (!confirm(`"${name || '이 학생'}"을 수강생 목록에서 삭제하시겠습니까?`)) return;
    setDeleting(enrollmentId);
    try {
      const res = await fetch(`/api/admin/enrollments/${enrollmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { showError('삭제 실패'); return; }
      showSuccess('삭제되었습니다');
      setStudents(prev => prev.filter(e => e.id !== enrollmentId));
    } finally { setDeleting(null); }
  };

  const addStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail.trim()) return;
    setAdding(true);
    setAddError('');
    try {
      const res = await fetch('/api/admin/enrollments/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ courseId: course.id, email: addEmail.trim(), name: addName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error || '추가 실패'); return; }
      showSuccess(`✅ ${data.enrollment.userName || addEmail} 추가 완료! 입장코드: ${data.enrollment.entryCode}`);
      setStudents(prev => [...prev, data.enrollment]);
      setAddEmail('');
      setAddName('');
      setShowAddForm(false);
    } finally { setAdding(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 flex-none">
          <div>
            <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2">
              <FaUserCheck className="text-emerald-500" /> 확정 수강생
            </h3>
            <p className="text-xs text-gray-500 truncate max-w-[240px]">{course.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowAddForm(v => !v); setAddError(''); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-black hover:bg-emerald-100 transition-colors"
            >
              <FaUserPlus className="text-[10px]" /> 직접 추가
            </button>
            <button onClick={onClose} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              <FaTimes />
            </button>
          </div>
        </div>

        {/* 직접 추가 폼 */}
        {showAddForm && (
          <form onSubmit={addStudent} className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-emerald-50 dark:bg-emerald-900/10 flex-none space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">학생 직접 추가 (즉시 확정)</p>
            <div className="flex gap-2">
              {/* 이메일 자동완성 */}
              <div className="flex-1 relative">
                <input
                  ref={emailInputRef}
                  type="text"
                  value={addEmail}
                  onChange={e => handleEmailChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="이메일 또는 이름 검색"
                  required
                  autoComplete="off"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {/* 드롭다운 */}
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute z-10 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                    {suggestions.map(u => (
                      <li
                        key={u.id}
                        onMouseDown={() => selectSuggestion(u)}
                        className="flex items-center gap-2 px-3 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 cursor-pointer transition-colors"
                      >
                        <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-none text-xs font-black text-emerald-600 dark:text-emerald-400">
                          {(u.displayName || u.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          {u.displayName && <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{u.displayName}</p>}
                          <p className="text-xs text-gray-400 truncate">{u.email}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <input
                type="text"
                value={addName}
                onChange={e => setAddName(e.target.value)}
                placeholder="이름 (선택)"
                className="w-28 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {addError && <p className="text-xs text-red-500 font-bold">{addError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setAddError(''); }}
                className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-500"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={adding || !addEmail.trim()}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-black transition-colors"
              >
                {adding ? '추가 중...' : '추가하기'}
              </button>
            </div>
          </form>
        )}

        {/* 학생 목록 */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">로딩 중...</div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">확정된 수강생이 없습니다</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {students.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-none">
                    <FaUserCheck className="text-emerald-600 dark:text-emerald-400 text-xs" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{s.userName || '(이름 없음)'}</p>
                    <p className="text-xs text-gray-400 truncate">{s.userEmail}</p>
                  </div>
                  {s.entryCode && (
                    <span className="px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800 font-mono font-black text-xs text-violet-700 dark:text-violet-300 tracking-widest flex-none">
                      {s.entryCode}
                    </span>
                  )}
                  <button
                    onClick={() => removeStudent(s.id, s.userName || '')}
                    disabled={deleting === s.id}
                    className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-400 hover:bg-red-100 disabled:opacity-50 transition-colors flex-none"
                    title="수강생 삭제"
                  >
                    <FaUserMinus className="text-xs" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 하단 카운트 */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex-none">
          <p className="text-xs text-gray-400 font-bold">총 {students.length}명 확정</p>
        </div>
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
  const [qrTarget, setQrTarget] = useState<{ courseId: string; title: string; classEntryCode?: string | null } | null>(null);
  const [enrollCourse, setEnrollCourse] = useState<Course | null>(null);
  const [studentsCourse, setStudentsCourse] = useState<Course | null>(null);
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
                  onClick={() => setQrTarget({ courseId: course.id, title: course.title, classEntryCode: course.classEntryCode })}
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

                {/* 확정 학생 목록 */}
                <button
                  onClick={() => setStudentsCourse(course)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-100 transition-colors"
                  title="확정 학생 목록"
                >
                  <FaUserCheck className="text-xs" /> 학생
                </button>

                {/* 수강 신청 목록 */}
                <button
                  onClick={() => setEnrollCourse(course)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 transition-colors"
                  title="대기 중인 신청"
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
      {qrTarget && session && (
        <QRModal
          courseId={qrTarget.courseId}
          title={qrTarget.title}
          classEntryCode={qrTarget.classEntryCode}
          token={session.access_token}
          onClose={() => setQrTarget(null)}
          onCodeRegenerated={(code) => {
            // courses 목록도 즉시 업데이트
            setCourses(prev => prev.map(c =>
              c.id === qrTarget.courseId ? { ...c, classEntryCode: code } : c
            ));
            setQrTarget(prev => prev ? { ...prev, classEntryCode: code } : null);
          }}
        />
      )}

      {/* 확정 학생 목록 모달 */}
      {studentsCourse && session && (
        <StudentsModal course={studentsCourse} token={session.access_token} onClose={() => setStudentsCourse(null)} />
      )}

      {/* 수강 신청 모달 */}
      {enrollCourse && session && (
        <EnrollmentsModal course={enrollCourse} token={session.access_token} onClose={() => setEnrollCourse(null)} />
      )}
    </div>
  );
}
