'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import type { AIApp, AppCategory, Prompt, Purchase } from '@/types/database';
import type { Session } from '@supabase/supabase-js';
import {
  FaLaptopCode, FaPenFancy, FaHeart, FaDownload, FaSpinner,
  FaList, FaThLarge, FaRocket, FaRegSmile, FaUserCircle, FaArrowRight,
  FaCamera, FaBook, FaTrash, FaPaperPlane,
} from 'react-icons/fa';
import LoadingDots from '@/components/LoadingDots';
import { useSearchParams, useRouter } from 'next/navigation';
import { getCategoryInfo } from '@/lib/categories';
import { getPromptCategoryInfo } from '@/lib/promptCategories';
import { useAppCategories, usePromptCategories } from '@/lib/useCategories';
import { getBrowserClient } from '@/lib/database';
import ExcelJS from 'exceljs';
import RoomCanvas from '@/components/room/RoomCanvas';

type Tab = 'home' | 'apps' | 'prompts' | 'likes' | 'guestbook' | 'purchases';

type GuestbookEntry = {
  id: string;
  content: string;
  created_at: string;
  writer: { id: string; display_name: string | null; avatar_url: string | null; username: string | null } | null;
};

type ProfileData = { username: string | null; coverImageUrl: string | null } | null;

type MyPageClientProps = {
  initialUserId: string | null;
  initialProfile: ProfileData;
  initialMyApps: AIApp[];
  initialMyPrompts: Prompt[];
  initialLikedApps: AIApp[];
  initialLikedPrompts: Prompt[];
};

const MyPageInner = dynamic(() => Promise.resolve(MyPageContent), {
  ssr: false,
  loading: () => <div className="py-12 text-center text-gray-500">로딩 중...</div>,
});

export default function MyPageClient(props: MyPageClientProps) {
  return <MyPageInner {...props} />;
}

// ── Category color helpers ──────────────────────────────────────
const APP_COLORS: Record<string, string> = {
  chatbot: 'from-blue-400 to-blue-600', 'content-generation': 'from-purple-400 to-purple-600',
  'data-analysis': 'from-emerald-400 to-emerald-600', 'image-generation': 'from-pink-400 to-pink-600',
  'code-assistant': 'from-amber-300 to-amber-500', translation: 'from-indigo-400 to-indigo-600',
  education: 'from-red-400 to-red-600', game: 'from-orange-400 to-orange-600',
  productivity: 'from-teal-400 to-teal-600',
};
const PROMPT_COLORS: Record<string, string> = {
  daily: 'from-emerald-300 to-emerald-500', work: 'from-blue-400 to-blue-600',
  fun: 'from-purple-400 to-pink-500', relationship: 'from-rose-400 to-red-500',
  education: 'from-amber-400 to-yellow-400',
};
const appColor = (c: string) => APP_COLORS[c] ?? 'from-gray-300 to-gray-400';
const promptColor = (c: string) => PROMPT_COLORS[c] ?? 'from-slate-300 to-slate-400';

// ── MyAppCard ───────────────────────────────────────────────────
function MyAppCard({ app, categories }: { app: AIApp; categories: any[] }) {
  const [imgErr, setImgErr] = useState(false);
  const info = getCategoryInfo(app.category, categories);
  const Icon = info.icon;
  return (
    <Link href={`/apps/${app.id}`} className="group flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden hover:border-blue-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <div className="relative aspect-[3/2] overflow-hidden bg-gray-100">
        {app.thumbnailUrl && !imgErr ? (
          <Image src={app.thumbnailUrl} alt={app.name} fill sizes="200px" className="object-cover group-hover:scale-105 transition-transform duration-500"
            style={{ objectPosition: `${app.thumbnailPositionX ?? 50}% ${app.thumbnailPositionY ?? 50}%` }} onError={() => setImgErr(true)} />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${appColor(app.category)} flex items-center justify-center`}>
            <Icon className="text-white text-3xl opacity-80 group-hover:scale-110 transition-transform" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold bg-black/40 px-2 py-0.5 rounded-full">OPEN →</span>
      </div>
      <div className="p-3">
        <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">{app.name}</h3>
        <p className="text-xs text-gray-400 mt-1 font-medium">{info.label}</p>
      </div>
    </Link>
  );
}

// ── MyPromptCard ────────────────────────────────────────────────
function MyPromptCard({ prompt, categories }: { prompt: Prompt; categories: any[] }) {
  const [imgErr, setImgErr] = useState(false);
  const info = getPromptCategoryInfo(prompt.category, categories);
  const Icon = info.icon;
  return (
    <Link href={`/prompts/${prompt.id}`} className="group flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden hover:border-emerald-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <div className="relative aspect-[3/2] overflow-hidden bg-gray-100">
        {prompt.thumbnailUrl && !imgErr ? (
          <Image src={prompt.thumbnailUrl} alt={prompt.name} fill sizes="200px" className="object-cover group-hover:scale-105 transition-transform duration-500"
            style={{ objectPosition: `${prompt.thumbnailPositionX ?? 50}% ${prompt.thumbnailPositionY ?? 50}%` }} onError={() => setImgErr(true)} />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${promptColor(prompt.category)} flex items-center justify-center`}>
            <Icon className="text-white text-3xl opacity-80 group-hover:scale-110 transition-transform" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold bg-black/40 px-2 py-0.5 rounded-full">OPEN →</span>
      </div>
      <div className="p-3">
        <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-emerald-600 transition-colors">{prompt.name}</h3>
        <p className="text-xs text-gray-400 mt-1 font-medium">{info.label}</p>
      </div>
    </Link>
  );
}

// ── AppRow ──────────────────────────────────────────────────────
function AppRow({ app, categories }: { app: AIApp; categories: any[] }) {
  const [imgErr, setImgErr] = useState(false);
  const info = getCategoryInfo(app.category, categories);
  const Icon = info.icon;
  return (
    <Link href={`/apps/${app.id}`} className="group flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50 hover:shadow-md hover:-translate-y-px transition-all duration-200">
      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
        {app.thumbnailUrl && !imgErr ? (
          <Image src={app.thumbnailUrl} alt={app.name} width={56} height={56} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            style={{ objectPosition: `${app.thumbnailPositionX ?? 50}% ${app.thumbnailPositionY ?? 50}%` }} onError={() => setImgErr(true)} />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${appColor(app.category)} flex items-center justify-center`}>
            <Icon className="text-white text-xl" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">{app.name}</h3>
        {app.description && <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{app.description}</p>}
        <span className="inline-block mt-1 text-xs font-semibold text-gray-400">{info.label}</span>
      </div>
      <FaArrowRight className="flex-shrink-0 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-200 text-sm" />
    </Link>
  );
}

// ── PromptRow ───────────────────────────────────────────────────
function PromptRow({ prompt, categories }: { prompt: Prompt; categories: any[] }) {
  const [imgErr, setImgErr] = useState(false);
  const info = getPromptCategoryInfo(prompt.category, categories);
  const Icon = info.icon;
  return (
    <Link href={`/prompts/${prompt.id}`} className="group flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 bg-white hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-md hover:-translate-y-px transition-all duration-200">
      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
        {prompt.thumbnailUrl && !imgErr ? (
          <Image src={prompt.thumbnailUrl} alt={prompt.name} width={56} height={56} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            style={{ objectPosition: `${prompt.thumbnailPositionX ?? 50}% ${prompt.thumbnailPositionY ?? 50}%` }} onError={() => setImgErr(true)} />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${promptColor(prompt.category)} flex items-center justify-center`}>
            <Icon className="text-white text-xl" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-gray-900 group-hover:text-emerald-600 transition-colors truncate">{prompt.name}</h3>
        {prompt.description && <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{prompt.description}</p>}
        <span className="inline-block mt-1 text-xs font-semibold text-gray-400">{info.label}</span>
      </div>
      <FaArrowRight className="flex-shrink-0 text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all duration-200 text-sm" />
    </Link>
  );
}

// ── List wrappers ───────────────────────────────────────────────
function AppList({ apps, viewMode, categories }: { apps: AIApp[]; viewMode: 'card' | 'list'; categories: any[] }) {
  if (!apps.length) return <Empty text="등록된 앱이 없습니다." />;
  if (viewMode === 'card') return <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{apps.map(a => <MyAppCard key={a.id} app={a} categories={categories} />)}</div>;
  return <div className="space-y-2">{apps.map(a => <AppRow key={a.id} app={a} categories={categories} />)}</div>;
}

function PromptList({ prompts, viewMode, categories }: { prompts: Prompt[]; viewMode: 'card' | 'list'; categories: any[] }) {
  if (!prompts.length) return <Empty text="등록된 프롬프트가 없습니다." />;
  if (viewMode === 'card') return <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{prompts.map(p => <MyPromptCard key={p.id} prompt={p} categories={categories} />)}</div>;
  return <div className="space-y-2">{prompts.map(p => <PromptRow key={p.id} prompt={p} categories={categories} />)}</div>;
}

function Empty({ text }: { text: string }) {
  return <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm">{text}</div>;
}

function SectionHeader({ title, borderColor, children }: { title: React.ReactNode; borderColor: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className={`text-base font-black text-gray-800 border-l-4 ${borderColor} pl-3`}>{title}</h2>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

function ExportBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition">
      <FaDownload className="text-[10px]" /> {label}
    </button>
  );
}

// ── TitleBar ────────────────────────────────────────────────────
function TitleBar({ title }: { title: string }) {
  return (
    <div className="bg-gradient-to-r from-[#0058e6] via-[#3a93ff] to-[#0058e6] px-2 py-1 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <div className="bg-white p-0.5 rounded-[2px] flex-shrink-0"><FaRocket className="text-[#0058e6] text-[10px]" /></div>
        <span className="text-white text-xs font-bold drop-shadow-sm truncate">{title}</span>
      </div>
      <div className="flex gap-[2px] flex-shrink-0">
        <button className="w-5 h-5 bg-[#ebeadb] border border-white text-black font-bold text-[10px] flex items-center justify-center hover:bg-[#d4d0c8]">_</button>
        <button className="w-5 h-5 bg-[#ebeadb] border border-white text-black font-bold text-[10px] flex items-center justify-center hover:bg-[#d4d0c8]">□</button>
        <Link href="/" className="w-5 h-5 bg-[#e81123] border border-white text-white font-bold text-[10px] flex items-center justify-center">X</Link>
      </div>
    </div>
  );
}

// ── VibeTabButton (right side) ──────────────────────────────────
function VibeTabButton({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color: string }) {
  return (
    <button onClick={onClick} className={`relative px-2.5 py-4 text-xs font-bold transition-all duration-300 rounded-r-xl ${active ? `${color} text-white translate-x-1 shadow-lg z-20 w-[60px]` : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200 border-l-0 w-[50px]'}`}>
      <div className="vertical-text">{label}</div>
      {active && <div className={`absolute left-[-4px] top-0 bottom-0 w-[5px] ${color}`} />}
    </button>
  );
}

// ── Main component ──────────────────────────────────────────────
function MyPageContent({
  initialUserId, initialProfile, initialMyApps, initialMyPrompts, initialLikedApps, initialLikedPrompts,
}: MyPageClientProps) {
  const router = useRouter();
  const { user, session, isAdmin, loading: authLoading, signInWithGoogle } = useAuth();
  const { categories: appCategories } = useAppCategories();
  const { categories: promptCategories } = usePromptCategories();
  const [myApps, setMyApps] = useState<AIApp[]>(initialMyApps);
  const [likedApps, setLikedApps] = useState<AIApp[]>(initialLikedApps);
  const [myPrompts, setMyPrompts] = useState<Prompt[]>(initialMyPrompts);
  const [likedPrompts, setLikedPrompts] = useState<Prompt[]>(initialLikedPrompts);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(initialProfile?.coverImageUrl ?? null);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();

  // Guestbook state
  const [gbEntries, setGbEntries] = useState<GuestbookEntry[]>([]);
  const [gbLoading, setGbLoading] = useState(false);
  const [gbPosting, setGbPosting] = useState(false);
  const [gbText, setGbText] = useState('');
  const gbFetched = useRef(false);

  const username = initialProfile?.username ?? null;
  const profileUrl = username ? `/${username}` : '/my';
  // 실제 배포 도메인 기준으로 표시 (localhost/Vercel 자동 감지)
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const displayUrl = username ? `${origin}/${username}` : `${origin}/my`;

  useEffect(() => {
    setMyApps(initialMyApps); setMyPrompts(initialMyPrompts);
    setLikedApps(initialLikedApps); setLikedPrompts(initialLikedPrompts);
  }, [initialMyApps, initialMyPrompts, initialLikedApps, initialLikedPrompts]);

  useEffect(() => {
    if (authLoading) return;
    if ((user?.id ?? null) !== initialUserId) router.refresh();
  }, [authLoading, user?.id, initialUserId, router]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'prompts' || tab === 'likes' || tab === 'apps' || tab === 'home' || tab === 'guestbook' || tab === 'purchases') setActiveTab(tab as Tab);
  }, [searchParams]);

  // Guestbook fetch (탭 전환 시 1회)
  useEffect(() => {
    if (activeTab !== 'guestbook' || gbFetched.current || !initialUserId) return;
    gbFetched.current = true;
    setGbLoading(true);
    fetch(`/api/guestbook?owner_id=${initialUserId}`)
      .then(r => r.json())
      .then(data => setGbEntries(Array.isArray(data) ? data : []))
      .finally(() => setGbLoading(false));
  }, [activeTab, initialUserId]);

  const postGbEntry = async () => {
    if (!gbText.trim() || gbPosting || !initialUserId) return;
    setGbPosting(true);
    try {
      const res = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_id: initialUserId, content: gbText.trim() }),
      });
      const data = await res.json();
      if (res.ok) { setGbEntries(prev => [data, ...prev]); setGbText(''); }
      else alert(data.error ?? '작성 실패');
    } finally { setGbPosting(false); }
  };

  const deleteGbEntry = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    const res = await fetch(`/api/guestbook?id=${id}`, { method: 'DELETE' });
    if (res.ok) setGbEntries(prev => prev.filter(e => e.id !== id));
  };

  // ── Cover image upload ──────────────────────────────────────
  const handleCoverUpload = async (file: File) => {
    if (!user || coverUploading) return;
    setCoverUploading(true);
    try {
      const supabase = getBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session');

      const form = new FormData();
      form.append('file', file);

      const res = await fetch('/api/profile/upload-cover', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setCoverImageUrl(json.url);
    } catch (err) {
      console.error('Cover upload failed:', err);
      alert('업로드 실패: ' + (err instanceof Error ? err.message : '알 수 없는 오류'));
    } finally {
      setCoverUploading(false);
    }
  };

  // ── Export helpers ──────────────────────────────────────────
  const fmt = (v?: Date | null) => (v ? v.toISOString() : '');
  const dl = (content: BlobPart, filename: string, mime: string) => {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };
  const exportApps = async (apps: AIApp[], format: 'csv' | 'xlsx', prefix: string) => {
    if (!apps.length) return;
    const rows = apps.map(a => { const info = getCategoryInfo(a.category, appCategories); return { '앱 ID': a.id, '앱 이름': a.name, '설명': a.description, '카테고리': info.label, '등록일': fmt(a.createdAt), '좋아요 수': a.likeCount }; });
    const ds = new Date().toISOString().slice(0, 10);
    if (format === 'csv') {
      const headers = Object.keys(rows[0]);
      const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify((r as Record<string, unknown>)[h] ?? '')).join(','))].join('\n');
      dl(csv, `${prefix}-${ds}.csv`, 'text/csv;charset=utf-8');
      return;
    }
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('apps');
    ws.columns = Object.keys(rows[0]).map(h => ({ header: h, key: h }));
    rows.forEach(r => ws.addRow(r));
    const buffer = await wb.xlsx.writeBuffer();
    dl(buffer, `${prefix}-${ds}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };
  const exportPrompts = async (prompts: Prompt[], format: 'csv' | 'xlsx', prefix: string) => {
    if (!prompts.length) return;
    const rows = prompts.map(p => { const info = getPromptCategoryInfo(p.category, promptCategories); return { '프롬프트 ID': p.id, '이름': p.name, '설명': p.description, '카테고리': info.label, '등록일': fmt(p.createdAt), '좋아요 수': p.likeCount }; });
    const ds = new Date().toISOString().slice(0, 10);
    if (format === 'csv') {
      const headers = Object.keys(rows[0]);
      const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify((r as Record<string, unknown>)[h] ?? '')).join(','))].join('\n');
      dl(csv, `${prefix}-${ds}.csv`, 'text/csv;charset=utf-8');
      return;
    }
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('prompts');
    ws.columns = Object.keys(rows[0]).map(h => ({ header: h, key: h }));
    rows.forEach(r => ws.addRow(r));
    const buffer = await wb.xlsx.writeBuffer();
    dl(buffer, `${prefix}-${ds}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };

  // ── Auth states ─────────────────────────────────────────────
  if (authLoading) return <LoadingDots message="로그인 상태를 확인하는 중..." />;

  if (!user) return (
    <div className="w-full h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] bg-[#6699bc] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#ebeadb] border-2 border-white shadow-2xl rounded-sm overflow-hidden">
        <TitleBar title="AI LABS :: My Vibe Space" />
        <div className="p-12 text-center bg-[#94b3c7]">
          <div className="bg-white/80 rounded-2xl p-8 border border-white shadow-lg">
            <FaUserCircle className="text-6xl text-gray-300 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-800 mb-2">로그인이 필요합니다</h1>
            <p className="text-gray-600 text-sm mb-6">마이 바이브 스페이스를 보려면 로그인해주세요.</p>
            <button onClick={signInWithGoogle} className="bg-[#4c8bf5] text-white px-6 py-2.5 rounded-full font-bold hover:bg-[#3a7ae0] transition text-sm">Google 로그인</button>
          </div>
        </div>
      </div>
    </div>
  );

  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || '사용자';
  const avatarUrl = user.user_metadata?.avatar_url;

  const tabConfig: { key: Tab; label: string; shortLabel: string; menuLabel: string; color: string }[] = [
    { key: 'home', label: 'Home', shortLabel: '홈', menuLabel: 'Home', color: 'bg-[#4c8bf5]' },
    { key: 'apps', label: 'Apps', shortLabel: '앱/프롬프트', menuLabel: 'Apps', color: 'bg-[#ed3124]' },
    { key: 'prompts', label: 'Prompts', shortLabel: '프롬프트', menuLabel: 'Prompts', color: 'bg-[#10b981]' },
    { key: 'likes', label: 'Likes', shortLabel: '좋아요', menuLabel: 'Likes', color: 'bg-[#8b5cf6]' },
    { key: 'guestbook', label: 'Guest', shortLabel: '방명록', menuLabel: 'Guestbook', color: 'bg-[#f59e0b]' },
    { key: 'purchases', label: 'Buy', shortLabel: '구매', menuLabel: 'Purchases', color: 'bg-[#0ea5e9]' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <HomeTab ownerId={initialUserId ?? ''} displayName={displayName} myApps={myApps} myPrompts={myPrompts} likedApps={likedApps} likedPrompts={likedPrompts} onTabChange={setActiveTab} isOwner isAdmin={isAdmin} />;
      case 'apps': return <AppsTab myApps={myApps} myPrompts={myPrompts} viewMode={viewMode} appCategories={appCategories} promptCategories={promptCategories} exportApps={exportApps} exportPrompts={exportPrompts} />;
      case 'prompts': return <PromptsTab myPrompts={myPrompts} viewMode={viewMode} promptCategories={promptCategories} exportPrompts={exportPrompts} />;
      case 'likes': return <LikesTab likedApps={likedApps} likedPrompts={likedPrompts} viewMode={viewMode} appCategories={appCategories} promptCategories={promptCategories} />;
      case 'purchases': return <PurchasesTab session={session} />;
      case 'guestbook': return (
        <div className="animate-in fade-in duration-500 space-y-4">
          <h2 className="text-base font-black text-gray-800 border-l-4 border-amber-400 pl-3 flex items-center gap-2">
            <FaBook className="text-amber-500" />방명록 <span className="text-sm font-normal text-gray-400">({gbEntries.length})</span>
          </h2>
          {/* 오너도 방명록 작성 가능 */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-amber-700 mb-2">내 스페이스에 직접 글을 남길 수도 있어요!</p>
            <div className="flex gap-2">
              <textarea value={gbText} onChange={e => setGbText(e.target.value)} maxLength={200} rows={2}
                placeholder="방명록 글 작성... (최대 200자)"
                className="flex-1 resize-none rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200" />
              <button onClick={postGbEntry} disabled={!gbText.trim() || gbPosting}
                className="flex-shrink-0 w-10 bg-amber-400 hover:bg-amber-500 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition">
                {gbPosting ? <FaSpinner className="animate-spin text-sm" /> : <FaPaperPlane className="text-sm" />}
              </button>
            </div>
            <p className="text-right text-xs text-amber-400 mt-1">{gbText.length}/200</p>
          </div>
          {gbLoading ? (
            <div className="flex justify-center py-8"><LoadingDots fullscreen={false} size="sm" /></div>
          ) : gbEntries.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-amber-100 rounded-2xl text-gray-400 text-sm">아직 방명록이 없습니다.</div>
          ) : (
            <div className="space-y-3">
              {gbEntries.map(e => (
                <div key={e.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-amber-100 flex items-center justify-center border border-amber-200">
                      {e.writer?.avatar_url
                        ? <Image src={e.writer.avatar_url} alt="" width={36} height={36} className="w-full h-full object-cover" unoptimized referrerPolicy="no-referrer" />
                        : <FaUserCircle className="text-amber-300 text-xl" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-gray-700">{e.writer?.display_name ?? '익명'}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] text-gray-300">{new Date(e.created_at).toLocaleDateString('ko-KR')}</span>
                          <button onClick={() => deleteGbEntry(e.id)} className="text-gray-300 hover:text-red-400 transition"><FaTrash className="text-[10px]" /></button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">{e.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div className="w-full h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] bg-[#6699bc] flex items-center justify-center p-2 sm:p-3 font-sans">
      <div className="w-full h-full max-w-[1200px] bg-[#ebeadb] border-2 border-white shadow-2xl rounded-sm overflow-hidden flex flex-col">
        <TitleBar title={`AI LABS :: My Vibe Space — [${displayName}님의 스페이스]`} />

        {/* ── Menu Bar (탭 내비게이션) ─────────────────────── */}
        <div className="hidden md:block bg-[#ebeadb] border-b border-[#808080] flex-shrink-0">
          {/* Menu items = Tab links */}
          <div className="flex gap-0 px-2 pt-1">
            {tabConfig.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-1 text-xs font-bold transition-all border-t border-l border-r rounded-t-sm ${
                  activeTab === tab.key
                    ? 'bg-white border-[#808080] text-black z-10'
                    : 'bg-[#ebeadb] border-transparent text-gray-600 hover:text-black hover:bg-[#d4d0c8]'
                }`}
              >
                {tab.menuLabel}
              </button>
            ))}
          </div>
          {/* Address Bar */}
          <div className="flex items-center gap-2 mx-2 mt-1 mb-1.5 px-1 py-0.5 bg-white border border-[#808080] rounded-sm shadow-inner">
            <span className="text-[#808080] text-xs font-bold border-r pr-2 ml-1">Address</span>
            <Link href={profileUrl} className="text-blue-600 text-xs flex-1 truncate font-mono hover:underline" target="_blank" rel="noopener noreferrer">
              {displayUrl}
            </Link>
            <Link href={profileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs font-bold border-l pl-2 mr-1 hover:underline flex-shrink-0">Go</Link>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 bg-[#94b3c7] p-2 sm:p-3 relative min-h-0">
          <div className="hidden md:block absolute inset-3 border-2 border-dashed border-white/40 rounded-[28px] pointer-events-none" />

          {/* ── DESKTOP 3-column ────────────────────────────── */}
          <div className="relative z-10 hidden lg:flex h-full items-stretch">

            {/* Left Sidebar */}
            <div className="w-[210px] xl:w-[230px] bg-[#f0f0f0]/90 backdrop-blur-sm rounded-l-[24px] border border-white/50 border-r-0 p-4 flex flex-col items-center flex-shrink-0 overflow-y-auto">
              <div className="w-full bg-white border border-gray-300 p-3 rounded-xl shadow-sm mb-3">
                <div className="aspect-square bg-[#f8f8f8] rounded-xl overflow-hidden border border-[#eee] flex items-center justify-center mb-3">
                  {avatarUrl ? <Image src={avatarUrl} alt="프로필" width={180} height={180} className="w-full h-full object-cover" unoptimized referrerPolicy="no-referrer" /> : <FaUserCircle className="text-8xl text-gray-200" />}
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-indigo-500 mb-1 uppercase tracking-tight">My Vibe Space</p>
                  <h2 className="text-base font-black text-gray-900 leading-tight truncate">{displayName}</h2>
                  {username && <p className="text-xs text-indigo-400 mt-0.5 font-mono">@{username}</p>}
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{user.email}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="w-full bg-white/60 border border-gray-300 p-3 rounded-xl mb-3">
                <div className="flex items-center gap-1 text-indigo-600 font-bold text-xs mb-2"><FaRegSmile /> <span>STATS</span></div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center"><span className="text-gray-500 flex items-center gap-1.5 text-xs"><FaLaptopCode className="text-blue-400" /> 내 앱</span><span className="font-black text-indigo-600">{myApps.length}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-500 flex items-center gap-1.5 text-xs"><FaPenFancy className="text-emerald-400" /> 프롬프트</span><span className="font-black text-emerald-600">{myPrompts.length}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-500 flex items-center gap-1.5 text-xs"><FaHeart className="text-rose-400" /> 좋아요</span><span className="font-black text-rose-600">{likedApps.length + likedPrompts.length}</span></div>
                </div>
              </div>

              {/* View Toggle */}
              <div className="w-full mb-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">View</p>
                <div className="flex rounded-lg overflow-hidden border border-gray-200">
                  <button onClick={() => setViewMode('card')} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold transition ${viewMode === 'card' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}><FaThLarge /> 카드</button>
                  <button onClick={() => setViewMode('list')} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold transition ${viewMode === 'list' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}><FaList /> 리스트</button>
                </div>
              </div>

              {/* Public Profile Link */}
              {username && (
                <div className="w-full mb-3">
                  <Link href={profileUrl} target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition">
                    🔗 공개 프로필 보기
                  </Link>
                </div>
              )}

              {/* Export */}
              <div className="w-full mt-auto space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Export</p>
                <button onClick={() => exportApps(myApps, 'csv', 'my-apps')} className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:border-blue-300 transition"><FaDownload className="text-blue-400" /> 내 앱 CSV</button>
                <button onClick={() => exportPrompts(myPrompts, 'csv', 'my-prompts')} className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:border-emerald-300 transition"><FaDownload className="text-emerald-400" /> 프롬프트 CSV</button>
              </div>
            </div>

            {/* Center Content */}
            <div className="flex-1 bg-white shadow-2xl relative flex flex-col overflow-hidden min-w-0">
              <div className="px-5 pt-4 pb-3 flex-shrink-0 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-bold text-[#4c8bf5] tracking-tight truncate">
                    {displayName} <span className="text-gray-400 font-normal text-base">의 My Vibe Space</span>
                  </h1>
                  <span className="text-xs font-mono text-gray-300 uppercase flex-shrink-0 ml-2">My Digital Asset</span>
                </div>
              </div>
              <div className="flex-1 px-5 pb-5 pt-4 overflow-y-auto custom-scrollbar">
                {renderContent()}
              </div>
            </div>

            {/* Right Tabs */}
            <div className="flex flex-col gap-[2px] pt-8 flex-shrink-0">
              {tabConfig.map(tab => <VibeTabButton key={tab.key} active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} label={tab.label} color={tab.color} />)}
            </div>
          </div>

          {/* ── MOBILE Stack ────────────────────────────────── */}
          <div className="lg:hidden flex flex-col h-full rounded-2xl overflow-hidden bg-white shadow-xl">
            <div className="flex items-center gap-3 p-3 bg-[#4c8bf5] flex-shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white flex items-center justify-center bg-indigo-300 flex-shrink-0">
                {avatarUrl ? <Image src={avatarUrl} alt="프로필" width={40} height={40} className="w-full h-full object-cover" unoptimized referrerPolicy="no-referrer" /> : <FaUserCircle className="text-white text-2xl" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white font-black text-sm truncate">{displayName}</p>
                {username && <p className="text-blue-200 text-xs font-mono">@{username}</p>}
              </div>
              <div className="flex gap-3 flex-shrink-0 text-xs font-bold text-white">
                <span className="flex flex-col items-center"><span className="text-blue-200 text-[10px]">앱</span>{myApps.length}</span>
                <span className="flex flex-col items-center"><span className="text-blue-200 text-[10px]">프롬</span>{myPrompts.length}</span>
                <span className="flex flex-col items-center"><span className="text-blue-200 text-[10px]">좋아요</span>{likedApps.length + likedPrompts.length}</span>
              </div>
            </div>
            <div className="flex border-b border-gray-100 bg-white flex-shrink-0 overflow-x-auto">
              {tabConfig.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 min-w-[60px] py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap px-2 ${activeTab === tab.key ? 'border-[#4c8bf5] text-[#4c8bf5] bg-blue-50' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                  {tab.shortLabel}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100 flex-shrink-0">
              <div className="flex rounded-lg overflow-hidden border border-gray-200">
                <button onClick={() => setViewMode('card')} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold transition ${viewMode === 'card' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-500'}`}><FaThLarge /> 카드</button>
                <button onClick={() => setViewMode('list')} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold transition ${viewMode === 'list' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-500'}`}><FaList /> 리스트</button>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => exportApps(myApps, 'csv', 'my-apps')} className="flex items-center gap-1 px-2 py-1 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-500"><FaDownload className="text-blue-400 text-[10px]" /> 앱</button>
                <button onClick={() => exportPrompts(myPrompts, 'csv', 'my-prompts')} className="flex items-center gap-1 px-2 py-1 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-500"><FaDownload className="text-emerald-400 text-[10px]" /> 프롬</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">{renderContent()}</div>
          </div>
        </div>
      </div>

      {/* Hidden file input for cover upload */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={e => { const file = e.target.files?.[0]; if (file) handleCoverUpload(file); e.target.value = ''; }}
      />
    </div>
  );
}

// ── HomeTab ─────────────────────────────────────────────────────
function HomeTab({ ownerId, displayName, myApps, myPrompts, likedApps, likedPrompts, onTabChange, isOwner, isAdmin }: {
  ownerId: string; displayName: string; myApps: AIApp[]; myPrompts: Prompt[];
  likedApps: AIApp[]; likedPrompts: Prompt[]; onTabChange: (t: Tab) => void;
  isOwner?: boolean; isAdmin?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Virtual Room */}
      <RoomCanvas ownerId={ownerId} isOwner={!!isOwner} isAdmin={!!isAdmin} />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => onTabChange('apps')} className="bg-[#f8f9fb] rounded-xl p-4 border border-[#eef1f5] text-left hover:border-indigo-300 hover:shadow-md transition-all">
          <h3 className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1.5 uppercase tracking-wider"><span className="w-2 h-2 bg-indigo-400 rounded-full" /> My Apps & Prompts</h3>
          <div className="grid grid-cols-2 gap-2 text-sm font-bold mb-2">
            <div className="flex justify-between border-r pr-2"><span className="text-gray-500 font-medium">Apps</span><span className="text-indigo-600">{myApps.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 font-medium">Prompts</span><span className="text-emerald-600">{myPrompts.length}</span></div>
          </div>
          {myApps.slice(0, 2).map(a => <p key={a.id} className="text-xs text-gray-500 truncate">🚀 {a.name}</p>)}
        </button>
        <button onClick={() => onTabChange('likes')} className="bg-[#f8f9fb] rounded-xl p-4 border border-[#eef1f5] text-left hover:border-rose-300 hover:shadow-md transition-all">
          <h3 className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1.5 uppercase tracking-wider"><span className="w-2 h-2 bg-rose-400 rounded-full" /> Liked Items</h3>
          <div className="grid grid-cols-2 gap-2 text-sm font-bold mb-2">
            <div className="flex justify-between border-r pr-2"><span className="text-gray-500 font-medium">Apps</span><span className="text-rose-500">{likedApps.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 font-medium">Prompts</span><span className="text-orange-500">{likedPrompts.length}</span></div>
          </div>
          {likedApps.slice(0, 2).map(a => <p key={a.id} className="text-xs text-gray-500 truncate">♡ {a.name}</p>)}
        </button>
      </div>

      {/* Purchases shortcut */}
      <button
        onClick={() => onTabChange('purchases')}
        className="w-full flex items-center justify-between px-4 py-3 bg-sky-50 border border-sky-200 rounded-xl hover:bg-sky-100 hover:shadow-md transition-all text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🛒</span>
          <div>
            <p className="text-sm font-black text-sky-700">구매 내역</p>
            <p className="text-xs text-sky-500">구매한 앱 · 프롬프트 확인</p>
          </div>
        </div>
        <span className="text-sky-400 text-lg">›</span>
      </button>

      {/* Quick Links */}
      <div className="flex gap-2">
        <Link href="/apps/new" className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-sm font-bold text-indigo-600 hover:bg-indigo-100 hover:shadow-md transition-all"><FaLaptopCode /> 새 앱 등록</Link>
        <Link href="/prompts/new" className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-bold text-emerald-600 hover:bg-emerald-100 hover:shadow-md transition-all"><FaPenFancy /> 새 프롬프트</Link>
      </div>
    </div>
  );
}

// ── AppsTab ──────────────────────────────────────────────────────
function AppsTab({ myApps, myPrompts, viewMode, appCategories, promptCategories, exportApps, exportPrompts }: {
  myApps: AIApp[]; myPrompts: Prompt[]; viewMode: 'card' | 'list'; appCategories: any[]; promptCategories: any[];
  exportApps: (a: AIApp[], f: 'csv' | 'xlsx', p: string) => Promise<void>;
  exportPrompts: (p: Prompt[], f: 'csv' | 'xlsx', p2: string) => Promise<void>;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
      <section>
        <SectionHeader title={<><FaLaptopCode className="inline text-blue-500 mr-1.5" />내 앱</>} borderColor="border-red-500">
          <Link href="/apps/new" className="text-xs text-blue-600 hover:underline font-semibold">새 앱 등록</Link>
          {myApps.length > 0 && <><ExportBtn onClick={() => exportApps(myApps, 'csv', 'my-apps')} label="CSV" /><ExportBtn onClick={() => exportApps(myApps, 'xlsx', 'my-apps')} label="XLSX" /></>}
        </SectionHeader>
        <AppList apps={myApps} viewMode={viewMode} categories={appCategories} />
      </section>
      <section>
        <SectionHeader title={<><FaPenFancy className="inline text-emerald-500 mr-1.5" />내 프롬프트</>} borderColor="border-emerald-500">
          <Link href="/prompts/new" className="text-xs text-emerald-600 hover:underline font-semibold">새 프롬프트</Link>
          {myPrompts.length > 0 && <><ExportBtn onClick={() => exportPrompts(myPrompts, 'csv', 'my-prompts')} label="CSV" /><ExportBtn onClick={() => exportPrompts(myPrompts, 'xlsx', 'my-prompts')} label="XLSX" /></>}
        </SectionHeader>
        <PromptList prompts={myPrompts} viewMode={viewMode} categories={promptCategories} />
      </section>
    </div>
  );
}

// ── PromptsTab ───────────────────────────────────────────────────
function PromptsTab({ myPrompts, viewMode, promptCategories, exportPrompts }: {
  myPrompts: Prompt[]; viewMode: 'card' | 'list'; promptCategories: any[];
  exportPrompts: (p: Prompt[], f: 'csv' | 'xlsx', p2: string) => void;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <SectionHeader title="My Prompts" borderColor="border-emerald-500">
        <Link href="/prompts/new" className="text-xs text-emerald-600 hover:underline font-semibold">새 프롬프트</Link>
        {myPrompts.length > 0 && <><ExportBtn onClick={() => exportPrompts(myPrompts, 'csv', 'my-prompts')} label="CSV" /><ExportBtn onClick={() => exportPrompts(myPrompts, 'xlsx', 'my-prompts')} label="XLSX" /></>}
      </SectionHeader>
      <PromptList prompts={myPrompts} viewMode={viewMode} categories={promptCategories} />
    </div>
  );
}

// ── LikesTab ─────────────────────────────────────────────────────
function LikesTab({ likedApps, likedPrompts, viewMode, appCategories, promptCategories }: {
  likedApps: AIApp[]; likedPrompts: Prompt[]; viewMode: 'card' | 'list'; appCategories: any[]; promptCategories: any[];
}) {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
      <section>
        <SectionHeader title={<><FaHeart className="inline text-rose-500 mr-1.5" />좋아요한 앱</>} borderColor="border-rose-500" />
        <AppList apps={likedApps} viewMode={viewMode} categories={appCategories} />
      </section>
      <section>
        <SectionHeader title={<><FaHeart className="inline text-orange-500 mr-1.5" />좋아요한 프롬프트</>} borderColor="border-orange-500" />
        <PromptList prompts={likedPrompts} viewMode={viewMode} categories={promptCategories} />
      </section>
    </div>
  );
}

// ── 구매 내역 탭 ──────────────────────────────────────────────
function PurchasesTab({ session }: { session: Session | null }) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) { setLoading(false); return; }
    fetch('/api/purchases/my', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((d) => setPurchases(d.purchases ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  if (loading) return <div className="py-10 text-center text-gray-400 text-sm">구매 내역 불러오는 중...</div>;

  if (!purchases.length) {
    return (
      <div className="py-16 text-center space-y-3">
        <div className="text-4xl">🛒</div>
        <p className="font-bold text-gray-700 dark:text-gray-300">구매 내역이 없습니다</p>
        <p className="text-sm text-gray-400">유료 앱이나 프롬프트를 구매하면 여기에 표시됩니다.</p>
        <Link href="/apps" className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors">
          앱 둘러보기
        </Link>
      </div>
    );
  }

  const statusLabel = (status: string) => {
    if (status === 'paid') return { text: '결제완료', cls: 'bg-green-100 text-green-700' };
    if (status === 'pending_bank') return { text: '입금확인중', cls: 'bg-amber-100 text-amber-700' };
    if (status === 'cancelled') return { text: '취소됨', cls: 'bg-red-100 text-red-600' };
    if (status === 'refunded') return { text: '환불됨', cls: 'bg-orange-100 text-orange-600' };
    return { text: status, cls: 'bg-gray-100 text-gray-500' };
  };

  // 최근 48시간 이내 결제 완료된 항목
  const recentlyPaid = purchases.filter(
    (p) => p.status === 'paid' && p.paidAt && Date.now() - new Date(p.paidAt).getTime() < 48 * 60 * 60 * 1000,
  );

  return (
    <div className="animate-in fade-in duration-500 space-y-3">
      {recentlyPaid.length > 0 && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
          <span className="text-2xl flex-shrink-0">🎉</span>
          <div className="min-w-0">
            <p className="text-sm font-black text-green-700">결제가 확인되었습니다!</p>
            <p className="text-xs text-green-600 mt-0.5">
              {recentlyPaid.map((p) => p.amount.toLocaleString() + '원').join(', ')} 결제가 완료되어 콘텐츠를 이용하실 수 있습니다.
            </p>
          </div>
        </div>
      )}
      <h2 className="text-base font-black text-gray-800 dark:text-gray-100 border-l-4 border-sky-400 pl-3">
        구매 내역 <span className="text-sm font-normal text-gray-400">({purchases.length}건)</span>
      </h2>
      <div className="space-y-2">
        {purchases.map((p) => {
          const isCancelled = p.status === 'cancelled' || p.status === 'refunded';
          const { text: statusText, cls: statusCls } = statusLabel(p.status);
          const isRecentlyPaid = p.status === 'paid' && p.paidAt && Date.now() - new Date(p.paidAt).getTime() < 48 * 60 * 60 * 1000;
          return (
          <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border shadow-sm ${isCancelled ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 opacity-70' : isRecentlyPaid ? 'bg-green-50 border-green-300' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${p.productType === 'app' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'}`}>
                  {p.productType === 'app' ? '앱' : p.productType === 'prompt' ? '프롬프트' : '구독'}
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${statusCls}`}>
                  {statusText}
                </span>
              </div>
              <p className={`text-sm font-bold ${isCancelled ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
                {p.amount.toLocaleString()}원
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {p.paidAt ? new Date(p.paidAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date(p.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            {!isCancelled && p.productId && p.productType !== 'subscription' && (
              <Link
                href={`/${p.productType === 'app' ? 'apps' : 'prompts'}/${p.productId}`}
                className="flex-none ml-3 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors"
              >
                보러가기
              </Link>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}
