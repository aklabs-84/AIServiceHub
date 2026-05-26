'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Course, Enrollment } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { FaArrowLeft, FaLock, FaKey, FaExternalLinkAlt, FaEye, FaEyeSlash } from 'react-icons/fa';
import { HiAcademicCap } from 'react-icons/hi';
import NotionPageViewer from '@/components/NotionPageViewer';

function isNotionUrl(url: string) {
  try {
    const { hostname } = new URL(url);
    return hostname.includes('notion.so') || hostname.includes('notion.site');
  } catch { return false; }
}

interface Props {
  course: Course;
}

// ── 탭 타입 정의 ──────────────────────────────────────────────
interface Tab {
  id: string;
  title: string;
  url: string;
  type: string;      // 'main' | 'video' | 'file' | 'embed' | 'link'
  desc?: string;
}

function tabIcon(type: string) {
  if (type === 'video')  return '🎥';
  if (type === 'file')   return '📁';
  if (type === 'embed')  return '📺';
  if (type === 'main')   return '📖';
  return '🔗';
}

// ── 탭 콘텐츠 렌더링 ──────────────────────────────────────────
function TabContent({ tab, isAdmin }: { tab: Tab; isAdmin: boolean }) {
  if (isNotionUrl(tab.url)) {
    return <NotionPageViewer url={tab.url} defaultOpen={true} showExternalLink={isAdmin} />;
  }

  return (
    <a
      href={tab.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-4 p-5 rounded-2xl border-2 border-violet-200 dark:border-violet-800
        hover:border-violet-400 dark:hover:border-violet-600
        bg-violet-50 dark:bg-violet-900/20 transition-all group"
    >
      <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center flex-none text-xl">
        {tabIcon(tab.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
          {tab.title}
        </p>
        {tab.desc && <p className="text-xs text-gray-500 mt-0.5">{tab.desc}</p>}
        <p className="text-xs text-gray-400 truncate mt-0.5">{tab.url}</p>
      </div>
      <FaExternalLinkAlt className="text-violet-400 text-sm flex-none" />
    </a>
  );
}

export default function ClassroomClient({ course }: Props) {
  const router = useRouter();
  const { user, session, isAdmin } = useAuth();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [entryCodeInput, setEntryCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);

  // ── 탭 목록 구성 ──
  const tabs: Tab[] = [
    ...(course.materialUrl
      ? [{ id: 'main', title: '수업 자료', url: course.materialUrl, type: 'main' }]
      : []),
    ...course.materials.map((m, idx) => ({
      id: `m-${idx}`,
      title: m.title || `자료 ${idx + 1}`,
      url: m.url,
      type: m.type,
      desc: m.desc,
    })),
  ];

  const [activeTab, setActiveTab] = useState<string>(() => tabs[0]?.id ?? '');

  // 게스트 접근 복원 (sessionStorage — 탭 닫기 전까지 유지)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(`classroom_guest_${course.id}`) === 'true') {
      setAccessGranted(true);
    }
  }, [course.id]);

  // 로그인 사용자: 확정 수강 신청 확인
  useEffect(() => {
    if (!session) { setLoading(false); return; }
    async function check() {
      try {
        const res = await fetch(`/api/enrollments?courseId=${course.id}`, {
          headers: { Authorization: `Bearer ${session!.access_token}` },
        });
        if (res.ok) {
          const { enrollment: e } = await res.json();
          if (e?.status === 'confirmed') {
            setEnrollment(e);
            setAccessGranted(true);
          }
        }
      } finally { setLoading(false); }
    }
    check();
  }, [session, course.id]);

  // 관리자는 항상 접근
  useEffect(() => {
    if (isAdmin) { setAccessGranted(true); setLoading(false); }
  }, [isAdmin]);

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = entryCodeInput.trim().toUpperCase();
    if (!code) return;
    setValidatingCode(true);
    setCodeError('');
    try {
      const res = await fetch(`/api/enrollments/${code}`);
      if (!res.ok) {
        const d = await res.json();
        setCodeError(d.error || '유효하지 않은 입장코드입니다');
        return;
      }
      const { enrollment: e, classAccess, courseId: accessCourseId } = await res.json();

      // 클래스 단일 입장코드 (전원 공용)
      if (classAccess) {
        if (accessCourseId !== course.id) {
          setCodeError('이 클래스의 입장코드가 아닙니다');
          return;
        }
        sessionStorage.setItem(`classroom_guest_${course.id}`, 'true');
        setAccessGranted(true);
        return;
      }

      // 개인 입장코드
      if (e.courseId !== course.id) {
        setCodeError('이 클래스의 입장코드가 아닙니다');
        return;
      }
      setEnrollment(e);
      sessionStorage.setItem(`classroom_guest_${course.id}`, 'true');
      setAccessGranted(true);
    } catch { setCodeError('확인 중 오류가 발생했습니다'); }
    finally { setValidatingCode(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <HiAcademicCap className="text-6xl text-violet-300 dark:text-violet-700 animate-pulse" />
      </div>
    );
  }

  // 입장코드 입력 화면
  if (!accessGranted) {
    return (
      <main className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
        <div className="sticky top-16 md:top-20 z-20 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
          <div className="container mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
            <Link href={`/classes/${course.id}`} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <FaArrowLeft className="text-sm text-gray-600 dark:text-gray-400" />
            </Link>
            <span className="text-sm font-bold text-gray-600 dark:text-gray-400 truncate">{course.title}</span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center space-y-8">
            <div className="w-20 h-20 rounded-3xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto">
              <FaLock className="text-3xl text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">교실 입장</h1>
              <p className="text-sm text-gray-500">
                {user ? '수강이 확정된 경우 입장코드를 입력하세요.' : '입장코드가 있으면 아래에 입력하세요.'}
              </p>
            </div>

            <form onSubmit={handleCodeSubmit} className="space-y-3">
              <div className="relative">
                <FaKey className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="text"
                  value={entryCodeInput}
                  onChange={e => setEntryCodeInput(e.target.value.toUpperCase())}
                  placeholder="입장코드 (예: AB12CD34)"
                  className="w-full pl-10 pr-4 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-center text-lg font-black tracking-widest uppercase font-mono outline-none focus:ring-2 focus:ring-violet-500"
                  maxLength={10}
                />
              </div>
              {codeError && <p className="text-xs text-red-500 font-bold">{codeError}</p>}
              <button type="submit" disabled={!entryCodeInput.trim() || validatingCode} className="w-full py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-black shadow-lg shadow-violet-200 dark:shadow-violet-900/30 transition-all">
                {validatingCode ? '확인 중...' : '입장하기'}
              </button>
            </form>

            <Link href={`/classes/${course.id}`} className="block text-sm font-bold text-violet-600 dark:text-violet-400 hover:underline">
              ← 클래스 페이지로 돌아가기
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const activeItem = tabs.find(t => t.id === activeTab);

  // 교실 내용
  return (
    <main className="min-h-screen bg-white dark:bg-gray-950">
      {/* 상단 네비게이션 */}
      <div className="sticky top-16 md:top-20 z-20 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
        <div className="container mx-auto max-w-4xl px-4 py-3 flex items-center gap-3">
          <Link href={`/classes/${course.id}`} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <FaArrowLeft className="text-sm text-gray-600 dark:text-gray-400" />
          </Link>
          <HiAcademicCap className="text-violet-600 dark:text-violet-400" />
          <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{course.title}</span>
          {enrollment?.entryCode && (
            <button
              onClick={() => setShowCode(v => !v)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 text-xs font-black border border-violet-200 dark:border-violet-800"
            >
              {showCode ? <FaEyeSlash className="text-[10px]" /> : <FaEye className="text-[10px]" />}
              내 입장코드
            </button>
          )}
        </div>
        {enrollment?.entryCode && showCode && (
          <div className="bg-violet-50 dark:bg-violet-900/20 px-4 py-3 flex items-center justify-center gap-3">
            <FaKey className="text-violet-500 text-sm" />
            <span className="font-mono font-black text-xl tracking-widest text-violet-700 dark:text-violet-300">{enrollment.entryCode}</span>
          </div>
        )}
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* 환영 배너 */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white">
          <HiAcademicCap className="text-3xl mb-3" />
          <h1 className="text-2xl font-black mb-1">{course.title}</h1>
          <p className="text-sm text-white/80">수강 교실에 오신 걸 환영합니다!</p>
        </div>

        {/* 자료 없음 */}
        {tabs.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <HiAcademicCap className="text-6xl mx-auto mb-4 opacity-30" />
            <p className="text-sm font-bold">수업 자료가 준비 중입니다.</p>
          </div>
        )}

        {/* 탭 영역 */}
        {tabs.length > 0 && (
          <div className="rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            {/* 탭 바 */}
            <div className="flex overflow-x-auto bg-gray-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-800 scrollbar-none">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-5 py-3.5 text-sm font-bold whitespace-nowrap
                    border-b-2 transition-all flex-none
                    ${activeTab === tab.id
                      ? 'border-violet-500 text-violet-600 dark:text-violet-400 bg-white dark:bg-gray-950'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-gray-800/40'
                    }
                  `}
                >
                  <span>{tabIcon(tab.type)}</span>
                  <span className="max-w-[120px] sm:max-w-[180px] truncate">{tab.title}</span>
                </button>
              ))}
            </div>

            {/* 탭 콘텐츠 — key로 탭 전환 시 컴포넌트 완전 리마운트 */}
            <div className="p-5 bg-white dark:bg-gray-950 min-h-[200px]">
              {activeItem && <TabContent key={activeTab} tab={activeItem} isAdmin={isAdmin} />}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
