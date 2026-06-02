'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Course, Enrollment } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { FaLock, FaUsers, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaArrowLeft, FaCheckCircle, FaHourglassHalf, FaEdit, FaTimesCircle, FaTrash, FaCommentAlt } from 'react-icons/fa';
import { HiAcademicCap } from 'react-icons/hi';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface CourseComment {
  id: string;
  content: string;
  created_at: string;
  created_by: string;
  created_by_name: string;
  created_by_avatar_url: string | null;
}

interface Props {
  course: Course;
}

function toDate(d: Date | string): Date {
  if (d instanceof Date) return d;
  return new Date(d);
}

function formatDate(date: Date | string, full = false): string {
  const d = toDate(date);
  if (isNaN(d.getTime())) return '날짜 미정';
  const opts: Intl.DateTimeFormatOptions = full
    ? { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', weekday: 'long' }
    : { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', weekday: 'short' };
  return new Intl.DateTimeFormat('ko-KR', opts).format(d);
}

function getDurationLabel(start: Date | string, end: Date | string): string {
  const s = toDate(start);
  const e = toDate(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return '';
  const min = Math.round((e.getTime() - s.getTime()) / 60000);
  if (min >= 60) return `${Math.floor(min / 60)}시간${min % 60 > 0 ? ` ${min % 60}분` : ''}`;
  return `${min}분`;
}

function courseTypeLabel(type: string) {
  if (type === 'online') return { emoji: '🖥️', text: '온라인' };
  if (type === 'offline') return { emoji: '🏫', text: '오프라인' };
  if (type === 'content') return { emoji: '📚', text: '콘텐츠' };
  return { emoji: '🔀', text: '온·오프라인 혼합' };
}

function MaterialIcon({ type }: { type: string }) {
  if (type === 'video') return <span>🎥</span>;
  if (type === 'file') return <span>📁</span>;
  if (type === 'embed') return <span>📺</span>;
  return <span>🔗</span>;
}

export default function ClassDetailClient({ course }: Props) {
  const router = useRouter();
  const { user, session, isAdmin } = useAuth();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [checkingEnrollment, setCheckingEnrollment] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [depositorName, setDepositorName] = useState('');
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankResult, setBankResult] = useState<{ bankInfo: { bankName: string; accountNumber: string; accountHolder: string }; amount: number } | null>(null);
  const [error, setError] = useState('');

  const [comments, setComments] = useState<CourseComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState('');
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const isPaid = course.isPaid && course.price > 0;
  const isContent = course.courseType === 'content';
  const loc = courseTypeLabel(course.courseType);
  const durationLabel = (!isContent && course.startAt && course.endAt) ? getDurationLabel(course.startAt, course.endAt) : null;
  const now = new Date();
  const isEnded = !isContent && course.endAt ? toDate(course.endAt) < now : false;
  const isOngoing = !isContent && !isEnded && course.startAt ? toDate(course.startAt) <= now : false;

  useEffect(() => {
    if (!user || !session) { setCheckingEnrollment(false); return; }
    async function check() {
      try {
        const res = await fetch(`/api/enrollments?courseId=${course.id}`, {
          headers: { Authorization: `Bearer ${session!.access_token}` },
        });
        if (res.ok) {
          const { enrollment: e } = await res.json();
          setEnrollment(e ?? null);
        }
      } finally { setCheckingEnrollment(false); }
    }
    check();
  }, [user, session, course.id]);

  useEffect(() => {
    async function loadComments() {
      const res = await fetch(`/api/course-comments?courseId=${course.id}`);
      if (res.ok) setComments(await res.json());
    }
    loadComments();
  }, [course.id]);

  const handleCommentSubmit = async () => {
    if (!user || !session || !commentText.trim()) return;
    setSubmittingComment(true);
    setCommentError('');
    try {
      const res = await fetch('/api/course-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ courseId: course.id, content: commentText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setCommentError(data.error || '댓글 등록 실패'); return; }
      setComments(prev => [...prev, data]);
      setCommentText('');
    } catch { setCommentError('네트워크 오류가 발생했습니다'); }
    finally { setSubmittingComment(false); }
  };

  const handleCommentDelete = async (id: string) => {
    if (!session) return;
    const res = await fetch(`/api/course-comments?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) setComments(prev => prev.filter(c => c.id !== id));
  };

  const handleEnroll = async () => {
    if (!user || !session) return;
    if (isPaid) { setShowBankModal(true); return; }
    setEnrolling(true);
    setError('');
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ courseId: course.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '신청 실패'); return; }
      setEnrollment({ id: data.enrollmentId, courseId: course.id, userId: user.id, userName: null, userEmail: null, status: data.isWaitlist ? 'waitlist' : 'pending', entryCode: null, note: null, createdAt: new Date(), updatedAt: new Date() });
    } catch { setError('네트워크 오류가 발생했습니다'); }
    finally { setEnrolling(false); }
  };

  const handleBankEnroll = async () => {
    if (!user || !session || !depositorName.trim()) return;
    setEnrolling(true);
    setError('');
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ courseId: course.id, depositorName: depositorName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '신청 실패'); return; }
      setShowBankModal(false);
      setBankResult({ bankInfo: data.bankInfo, amount: course.price });
      setEnrollment({ id: data.enrollmentId, courseId: course.id, userId: user.id, userName: null, userEmail: null, status: 'pending', entryCode: null, note: null, createdAt: new Date(), updatedAt: new Date() });
    } catch { setError('네트워크 오류가 발생했습니다'); }
    finally { setEnrolling(false); }
  };

  const enrollmentStatusUI = () => {
    if (checkingEnrollment || !enrollment) return null;
    if (enrollment.status === 'confirmed') {
      return (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 space-y-3">
          <div className="flex items-center gap-3">
            <FaCheckCircle className="text-emerald-600 text-xl flex-none" />
            <p className="font-bold text-emerald-700 dark:text-emerald-400 text-sm flex-1">수강 확정!</p>
            <Link href={`/classes/${course.id}/classroom`} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 transition-colors flex-none">입장하기</Link>
          </div>
          {/* 오프라인/혼합: 클래스 공용 입장코드만 표시 */}
          {course.courseType !== 'online' && course.classEntryCode && (
            <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-1">입장코드</p>
              <span className="font-black font-mono text-2xl tracking-widest text-emerald-700 dark:text-emerald-300">{course.classEntryCode}</span>
            </div>
          )}
          {/* 온라인: 개인 입장코드만 표시 */}
          {course.courseType === 'online' && enrollment.entryCode && (
            <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-1">입장코드</p>
              <span className="font-black font-mono text-2xl tracking-widest text-emerald-700 dark:text-emerald-300">{enrollment.entryCode}</span>
            </div>
          )}
        </div>
      );
    }
    if (enrollment.status === 'waitlist') {
      return (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <FaHourglassHalf className="text-amber-600 text-xl flex-none" />
          <div>
            <p className="font-bold text-amber-700 dark:text-amber-400 text-sm">대기자 명단에 등록됨</p>
            <p className="text-xs text-amber-600 dark:text-amber-500">자리가 나면 관리자가 순서대로 확정합니다.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <FaHourglassHalf className="text-blue-600 text-xl flex-none" />
        <div>
          <p className="font-bold text-blue-700 dark:text-blue-400 text-sm">신청 완료 — 승인 대기 중</p>
          <p className="text-xs text-blue-600 dark:text-blue-500">{isPaid ? '입금 확인 후 관리자가 승인합니다.' : '관리자 승인 후 확정됩니다.'}</p>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950">
      <div className="sticky top-16 md:top-20 z-20 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
        <div className="container mx-auto max-w-4xl px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <FaArrowLeft className="text-sm text-gray-600 dark:text-gray-400" />
          </button>
          <span className="text-sm font-bold text-gray-600 dark:text-gray-400 truncate">{course.title}</span>
          {isAdmin && (
            <Link href={`/classes/${course.id}/edit`} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors">
              <FaEdit className="text-xs" /> 수정
            </Link>
          )}
        </div>
      </div>

      <article className="container mx-auto max-w-4xl px-4 py-10">
        {/* 썸네일 */}
        <div className={`relative aspect-[21/9] rounded-3xl overflow-hidden mb-8 bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 ${isEnded ? 'grayscale opacity-70' : ''}`}>
          {course.thumbnailUrl ? (
            <Image src={course.thumbnailUrl} alt={course.title} fill className="object-cover" sizes="(max-width: 896px) 100vw, 896px" style={{ objectPosition: `${course.thumbnailPositionX ?? 50}% ${course.thumbnailPositionY ?? 50}%` }} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <HiAcademicCap className="text-white/10 text-[200px] absolute" />
              <HiAcademicCap className="relative text-8xl text-white drop-shadow-2xl" />
            </div>
          )}
          {isEnded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/40">
              <div className="px-6 py-3 rounded-2xl bg-gray-900/80 backdrop-blur-sm border border-gray-700/50">
                <span className="text-white text-base font-black tracking-wider">클래스 종료</span>
              </div>
            </div>
          )}
          {isOngoing && (
            <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/90 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-white text-xs font-black">진행 중</span>
            </div>
          )}
        </div>

        {/* 종료 안내 배너 */}
        {isEnded && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 mb-8">
            <FaTimesCircle className="text-red-500 text-xl flex-none mt-0.5" />
            <div>
              <p className="font-black text-red-700 dark:text-red-400 text-sm">이 클래스는 종료되었습니다</p>
              <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">
                종료일: {course.endAt ? formatDate(course.endAt, true) : '-'} · 수강 신청이 마감되었습니다.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 본문 */}
          <div className="lg:col-span-2 space-y-6">
            {course.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {course.tags.map(tag => (
                  <span key={tag} className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/50">#{tag}</span>
                ))}
              </div>
            )}

            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-white">{course.title}</h1>

            {course.description && (
              <MarkdownRenderer content={course.description} />
            )}

            {/* 공개 자료 미리보기 (입장코드 없이도 볼 수 있는 정보) */}
            {course.materials.length > 0 && (
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">수업 자료 ({course.materials.length}개)</p>
                <div className="flex flex-wrap gap-2">
                  {course.materials.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs font-bold text-gray-700 dark:text-gray-300">
                      <MaterialIcon type={m.type} />
                      <span>{m.title || `자료 ${idx + 1}`}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-2">🔒 수강 확정 후 교실 페이지에서 열람 가능</p>
              </div>
            )}
          </div>

          {/* 사이드바 */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
              {isContent ? (
                <div className="flex items-start gap-3">
                  <span className="text-sm flex-none mt-0.5">📚</span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">진행 방식</p>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">콘텐츠 · 자기주도 학습</p>
                    <p className="text-xs text-violet-500 dark:text-violet-400 mt-0.5">수강 확정 후 언제든지 열람</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <FaCalendarAlt className="text-violet-500 text-sm flex-none mt-0.5" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">시작</p>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{course.startAt ? formatDate(course.startAt, true) : '-'}</p>
                    </div>
                  </div>
                  {durationLabel && (
                    <div className="flex items-start gap-3">
                      <FaClock className="text-violet-500 text-sm flex-none mt-0.5" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">소요 시간</p>
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{durationLabel}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <span className="text-sm flex-none mt-0.5">{loc.emoji}</span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">진행 방식</p>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{loc.text}</p>
                      {course.location && <p className="text-xs text-gray-400 mt-0.5">{course.location}</p>}
                    </div>
                  </div>
                </>
              )}
              {course.maxParticipants && (
                <div className="flex items-center gap-3">
                  <FaUsers className="text-violet-500 text-sm flex-none" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">정원</p>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{course.maxParticipants}명</p>
                  </div>
                </div>
              )}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                {isPaid
                  ? <p className="text-xl font-black text-gray-900 dark:text-white">{course.price.toLocaleString()}원</p>
                  : <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">🆓 무료</p>
                }
              </div>
            </div>

            {enrollmentStatusUI()}

            {isEnded ? (
              /* 종료된 클래스 — 신청 불가 안내 */
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-center space-y-1">
                <FaTimesCircle className="text-gray-400 text-2xl mx-auto" />
                <p className="text-sm font-black text-gray-500 dark:text-gray-400">수강 신청 마감</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">이 클래스는 종료되어 신청할 수 없습니다.</p>
              </div>
            ) : (
              <>
                {!checkingEnrollment && !enrollment && (
                  <div className="space-y-2">
                    {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
                    {user ? (
                      <button onClick={handleEnroll} disabled={enrolling} className="w-full py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-black text-sm shadow-lg shadow-violet-200 dark:shadow-violet-900/30 transition-all">
                        {enrolling ? '처리 중...' : isPaid ? '💳 수강 신청 (계좌이체)' : '✅ 무료 수강 신청'}
                      </button>
                    ) : (
                      <p className="text-center py-4 text-sm text-gray-500">수강 신청은 로그인 후 가능합니다.</p>
                    )}
                    <Link href={`/classes/${course.id}/classroom`} className="block w-full text-center py-3 rounded-2xl border-2 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 font-black text-sm hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all">
                      🔑 입장코드로 입장하기
                    </Link>
                  </div>
                )}

                {enrollment?.status === 'confirmed' && (
                  <Link href={`/classes/${course.id}/classroom`} className="block w-full text-center py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-lg transition-all">
                    🚪 교실 입장하기
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        {/* 댓글 섹션 */}
        <section className="mt-12 border-t border-gray-100 dark:border-gray-800 pt-10">
          <h2 className="flex items-center gap-2 text-lg font-black text-gray-900 dark:text-white mb-6">
            <FaCommentAlt className="text-violet-500 text-base" />
            댓글
            {comments.length > 0 && (
              <span className="text-sm font-bold text-gray-400">{comments.length}</span>
            )}
          </h2>

          {/* 댓글 목록 */}
          <div className="space-y-4 mb-8">
            {comments.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">첫 번째 댓글을 남겨보세요!</p>
            )}
            {comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex-none overflow-hidden bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  {c.created_by_avatar_url ? (
                    <img src={c.created_by_avatar_url} alt={c.created_by_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-xs font-black text-violet-600 dark:text-violet-400">{c.created_by_name[0] ?? '?'}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black text-gray-700 dark:text-gray-300">{c.created_by_name}</span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(c.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {(user?.id === c.created_by || isAdmin) && (
                      <button
                        onClick={() => handleCommentDelete(c.id)}
                        className="ml-auto p-1 rounded text-gray-300 hover:text-red-400 transition-colors"
                        title="삭제"
                      >
                        <FaTrash className="text-[10px]" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{c.content}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 댓글 입력 */}
          {user ? (
            <div className="space-y-2">
              {commentError && <p className="text-xs text-red-500 font-bold">{commentError}</p>}
              <textarea
                ref={commentInputRef}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleCommentSubmit(); }}
                placeholder="댓글을 입력하세요... (Cmd+Enter로 등록)"
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400">{commentText.length}/500</span>
                <button
                  onClick={handleCommentSubmit}
                  disabled={submittingComment || !commentText.trim() || commentText.length > 500}
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-black transition-colors"
                >
                  {submittingComment ? '등록 중...' : '댓글 등록'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-gray-400 py-4">댓글은 로그인 후 작성 가능합니다.</p>
          )}
        </section>
      </article>

      {/* 계좌이체 신청 모달 */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowBankModal(false)}>
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white mb-1">계좌이체 수강 신청</h2>
              <p className="text-sm text-gray-500">{course.title}</p>
            </div>
            <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
              <p className="text-xs font-black uppercase tracking-widest text-violet-500 mb-1">수강료</p>
              <p className="text-2xl font-black text-violet-700 dark:text-violet-300">{course.price.toLocaleString()}원</p>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">입금자명 *</label>
              <input type="text" value={depositorName} onChange={e => setDepositorName(e.target.value)} placeholder="입금 시 사용할 이름" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowBankModal(false)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-400">취소</button>
              <button onClick={handleBankEnroll} disabled={enrolling || !depositorName.trim()} className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-black text-sm">
                {enrolling ? '처리 중...' : '신청하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 입금 안내 모달 */}
      {bankResult && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl p-6 space-y-5">
            <div className="text-center">
              <div className="text-4xl mb-3">🏦</div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white mb-1">입금 안내</h2>
              <p className="text-sm text-gray-500">아래 계좌로 입금해 주세요</p>
            </div>
            <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800 space-y-3">
              <div className="flex justify-between"><span className="text-xs font-bold text-gray-500">은행</span><span className="text-sm font-black">{bankResult.bankInfo.bankName}</span></div>
              <div className="flex justify-between"><span className="text-xs font-bold text-gray-500">계좌번호</span><span className="text-sm font-black font-mono">{bankResult.bankInfo.accountNumber}</span></div>
              <div className="flex justify-between"><span className="text-xs font-bold text-gray-500">예금주</span><span className="text-sm font-black">{bankResult.bankInfo.accountHolder}</span></div>
              <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-3"><span className="text-xs font-bold text-gray-500">입금 금액</span><span className="text-base font-black text-violet-600 dark:text-violet-400">{bankResult.amount.toLocaleString()}원</span></div>
            </div>
            <button onClick={() => setBankResult(null)} className="w-full py-3 rounded-2xl bg-violet-600 text-white font-black text-sm">확인했습니다</button>
          </div>
        </div>
      )}
    </main>
  );
}
