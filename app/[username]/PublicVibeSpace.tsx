'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { AIApp, Prompt } from '@/types/database';
import { getCategoryInfo } from '@/lib/categories';
import { getPromptCategoryInfo } from '@/lib/promptCategories';
import { useAppCategories, usePromptCategories } from '@/lib/useCategories';
import { useAuth } from '@/contexts/AuthContext';
import { FaRocket, FaUserCircle, FaLaptopCode, FaPenFancy, FaHeart, FaBook, FaTrash, FaPaperPlane, FaSpinner } from 'react-icons/fa';
import RoomCanvas from '@/components/room/RoomCanvas';
import LoadingDots from '@/components/LoadingDots';

type Tab = 'home' | 'apps' | 'prompts' | 'guestbook';

type GuestbookEntry = {
  id: string;
  content: string;
  created_at: string;
  writer: { id: string; display_name: string | null; avatar_url: string | null; username: string | null } | null;
};

interface Profile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  coverImageUrl: string | null;
}

interface Props {
  profile: Profile;
  publicApps: AIApp[];
  publicPrompts: Prompt[];
}

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
const ac = (c: string) => APP_COLORS[c] ?? 'from-gray-300 to-gray-400';
const pc = (c: string) => PROMPT_COLORS[c] ?? 'from-slate-300 to-slate-400';

function AppCard({ app, categories }: { app: AIApp; categories: any[] }) {
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
          <div className={`w-full h-full bg-gradient-to-br ${ac(app.category)} flex items-center justify-center`}>
            <Icon className="text-white text-3xl opacity-80" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold bg-black/40 px-2 py-0.5 rounded-full">OPEN →</span>
      </div>
      <div className="p-3">
        <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">{app.name}</h3>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-400 font-medium">{info.label}</p>
          <span className="text-xs text-gray-400 flex items-center gap-0.5"><FaHeart className="text-[9px] text-rose-300" /> {app.likeCount}</span>
        </div>
      </div>
    </Link>
  );
}

function PromptCard({ prompt, categories }: { prompt: Prompt; categories: any[] }) {
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
          <div className={`w-full h-full bg-gradient-to-br ${pc(prompt.category)} flex items-center justify-center`}>
            <Icon className="text-white text-3xl opacity-80" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold bg-black/40 px-2 py-0.5 rounded-full">OPEN →</span>
      </div>
      <div className="p-3">
        <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-emerald-600 transition-colors">{prompt.name}</h3>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-400 font-medium">{info.label}</p>
          <span className="text-xs text-gray-400 flex items-center gap-0.5"><FaHeart className="text-[9px] text-rose-300" /> {prompt.likeCount}</span>
        </div>
      </div>
    </Link>
  );
}

export default function PublicVibeSpace({ profile, publicApps, publicPrompts }: Props) {
  const { categories: appCategories } = useAppCategories();
  const { categories: promptCategories } = usePromptCategories();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('home');

  // Guestbook state
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [gbLoading, setGbLoading] = useState(false);
  const [gbPosting, setGbPosting] = useState(false);
  const [gbText, setGbText] = useState('');
  const gbFetched = useRef(false);

  useEffect(() => {
    if (activeTab !== 'guestbook' || gbFetched.current) return;
    gbFetched.current = true;
    setGbLoading(true);
    fetch(`/api/guestbook?owner_id=${profile.id}`)
      .then(r => r.json())
      .then(data => setEntries(Array.isArray(data) ? data : []))
      .finally(() => setGbLoading(false));
  }, [activeTab, profile.id]);

  const postEntry = async () => {
    if (!gbText.trim() || gbPosting) return;
    setGbPosting(true);
    try {
      const res = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_id: profile.id, content: gbText.trim() }),
      });
      const data = await res.json();
      if (res.ok) { setEntries(prev => [data, ...prev]); setGbText(''); }
      else alert(data.error ?? '작성 실패');
    } finally { setGbPosting(false); }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    const res = await fetch(`/api/guestbook?id=${id}`, { method: 'DELETE' });
    if (res.ok) setEntries(prev => prev.filter(e => e.id !== id));
  };

  const tabConfig: { key: Tab; label: string; menuLabel: string; color: string }[] = [
    { key: 'home', label: 'Home', menuLabel: 'Home', color: 'bg-[#4c8bf5]' },
    { key: 'apps', label: 'Apps', menuLabel: 'Apps', color: 'bg-[#ed3124]' },
    { key: 'prompts', label: 'Prompts', menuLabel: 'Prompts', color: 'bg-[#10b981]' },
    { key: 'guestbook', label: 'Guest', menuLabel: 'Guestbook', color: 'bg-[#f59e0b]' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return (
        <div className="flex flex-col gap-4 animate-in fade-in duration-500">
          {/* Virtual Room (read-only for visitors) */}
          <RoomCanvas ownerId={profile.id} isOwner={false} />

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setActiveTab('apps')} className="bg-[#f8f9fb] rounded-xl p-4 border border-[#eef1f5] text-left hover:border-indigo-300 hover:shadow-md transition-all">
              <h3 className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1.5 uppercase tracking-wider"><span className="w-2 h-2 bg-indigo-400 rounded-full" /> Apps & Prompts</h3>
              <div className="grid grid-cols-2 gap-2 text-sm font-bold">
                <div className="flex justify-between border-r pr-2"><span className="text-gray-500 font-medium">Apps</span><span className="text-indigo-600">{publicApps.length}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 font-medium">Prompts</span><span className="text-emerald-600">{publicPrompts.length}</span></div>
              </div>
              {publicApps.slice(0, 2).map(a => <p key={a.id} className="text-xs text-gray-500 truncate mt-1">🚀 {a.name}</p>)}
            </button>
            <div className="bg-[#f8f9fb] rounded-xl p-4 border border-[#eef1f5]">
              <h3 className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1.5 uppercase tracking-wider"><span className="w-2 h-2 bg-rose-400 rounded-full" /> Total Likes</h3>
              <p className="text-2xl font-black text-rose-500">
                {publicApps.reduce((s, a) => s + a.likeCount, 0) + publicPrompts.reduce((s, p) => s + p.likeCount, 0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">received</p>
            </div>
          </div>

          {/* Recent apps preview */}
          {publicApps.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-black text-gray-800">최근 앱</h3>
                <button onClick={() => setActiveTab('apps')} className="text-xs text-blue-600 hover:underline font-semibold">전체 보기 →</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {publicApps.slice(0, 3).map(a => <AppCard key={a.id} app={a} categories={appCategories} />)}
              </div>
            </div>
          )}
        </div>
      );
      case 'apps': return (
        <div className="animate-in fade-in duration-500 space-y-5">
          <section>
            <h2 className="text-base font-black text-gray-800 border-l-4 border-red-500 pl-3 mb-3 flex items-center gap-2"><FaLaptopCode className="text-blue-500" />공개 앱 ({publicApps.length})</h2>
            {publicApps.length === 0 ? <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm">공개된 앱이 없습니다.</div> : <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{publicApps.map(a => <AppCard key={a.id} app={a} categories={appCategories} />)}</div>}
          </section>
        </div>
      );
      case 'prompts': return (
        <div className="animate-in fade-in duration-500">
          <h2 className="text-base font-black text-gray-800 border-l-4 border-emerald-500 pl-3 mb-3 flex items-center gap-2"><FaPenFancy className="text-emerald-500" />공개 프롬프트 ({publicPrompts.length})</h2>
          {publicPrompts.length === 0 ? <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm">공개된 프롬프트가 없습니다.</div> : <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{publicPrompts.map(p => <PromptCard key={p.id} prompt={p} categories={promptCategories} />)}</div>}
        </div>
      );
      case 'guestbook': return (
        <div className="animate-in fade-in duration-500 space-y-4">
          <h2 className="text-base font-black text-gray-800 border-l-4 border-amber-400 pl-3 flex items-center gap-2">
            <FaBook className="text-amber-500" />방명록
          </h2>

          {/* 작성 폼 */}
          {user ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-amber-700 mb-2">{profile.displayName}님의 스페이스에 방문 인사를 남겨보세요!</p>
              <div className="flex gap-2">
                <textarea
                  value={gbText}
                  onChange={e => setGbText(e.target.value)}
                  maxLength={200}
                  rows={2}
                  placeholder="방문 인사를 남겨보세요... (최대 200자)"
                  className="flex-1 resize-none rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
                />
                <button
                  onClick={postEntry}
                  disabled={!gbText.trim() || gbPosting}
                  className="flex-shrink-0 w-10 h-full bg-amber-400 hover:bg-amber-500 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition"
                >
                  {gbPosting ? <FaSpinner className="animate-spin text-sm" /> : <FaPaperPlane className="text-sm" />}
                </button>
              </div>
              <p className="text-right text-xs text-amber-400 mt-1">{gbText.length}/200</p>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center text-sm text-gray-500">
              방명록 작성은 <Link href="/auth" className="text-amber-500 font-bold hover:underline">로그인</Link> 후 가능합니다.
            </div>
          )}

          {/* 목록 */}
          {gbLoading ? (
            <div className="flex justify-center py-8"><LoadingDots fullscreen={false} size="sm" /></div>
          ) : entries.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-amber-100 rounded-2xl text-gray-400 text-sm">아직 방명록이 없습니다. 첫 번째 방문자가 되어보세요!</div>
          ) : (
            <div className="space-y-3">
              {entries.map(e => {
                const canDelete = user && (user.id === e.writer?.id || user.id === profile.id);
                return (
                  <div key={e.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
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
                            {canDelete && (
                              <button onClick={() => deleteEntry(e.id)} className="text-gray-300 hover:text-red-400 transition">
                                <FaTrash className="text-[10px]" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">{e.content}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div className="w-full h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] bg-[#6699bc] flex items-center justify-center p-2 sm:p-3 font-sans">
      <div className="w-full h-full max-w-[1200px] bg-[#ebeadb] border-2 border-white shadow-2xl rounded-sm overflow-hidden flex flex-col">

        {/* Title Bar */}
        <div className="bg-gradient-to-r from-[#0058e6] via-[#3a93ff] to-[#0058e6] px-2 py-1 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="bg-white p-0.5 rounded-[2px] flex-shrink-0"><FaRocket className="text-[#0058e6] text-[10px]" /></div>
            <span className="text-white text-xs font-bold drop-shadow-sm truncate">AI LABS :: Vibe Space — [{profile.displayName}님의 스페이스]</span>
          </div>
          <div className="flex gap-[2px] flex-shrink-0">
            <button className="w-5 h-5 bg-[#ebeadb] border border-white text-black font-bold text-[10px] flex items-center justify-center hover:bg-[#d4d0c8]">_</button>
            <button className="w-5 h-5 bg-[#ebeadb] border border-white text-black font-bold text-[10px] flex items-center justify-center hover:bg-[#d4d0c8]">□</button>
            <Link href="/" className="w-5 h-5 bg-[#e81123] border border-white text-white font-bold text-[10px] flex items-center justify-center">X</Link>
          </div>
        </div>

        {/* Menu + Address Bar */}
        <div className="hidden md:block bg-[#ebeadb] border-b border-[#808080] flex-shrink-0">
          <div className="flex gap-0 px-2 pt-1">
            {tabConfig.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-1 text-xs font-bold transition-all border-t border-l border-r rounded-t-sm -mb-px ${activeTab === tab.key ? 'bg-white border-[#808080] text-black z-10' : 'bg-[#ebeadb] border-transparent text-gray-600 hover:text-black hover:bg-[#d4d0c8]'}`}>
                {tab.menuLabel}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mx-2 mb-1 px-1 py-0.5 bg-white border border-[#808080] rounded-sm shadow-inner">
            <span className="text-[#808080] text-xs font-bold border-r pr-2 ml-1">Address</span>
            <span className="text-black text-xs flex-1 truncate font-mono">http://ailabs.com/{profile.username}</span>
            <span className="text-blue-600 text-xs font-bold border-l pl-2 mr-1 cursor-pointer">Go</span>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 bg-[#94b3c7] p-2 sm:p-3 relative min-h-0">
          <div className="hidden md:block absolute inset-3 border-2 border-dashed border-white/40 rounded-[28px] pointer-events-none" />

          {/* Desktop 3-column */}
          <div className="relative z-10 hidden lg:flex h-full items-stretch">
            {/* Left Sidebar */}
            <div className="w-[210px] xl:w-[230px] bg-[#f0f0f0]/90 backdrop-blur-sm rounded-l-[24px] border border-white/50 border-r-0 p-4 flex flex-col items-center flex-shrink-0">
              <div className="w-full bg-white border border-gray-300 p-3 rounded-xl shadow-sm mb-3">
                <div className="aspect-square bg-[#f8f8f8] rounded-xl overflow-hidden border border-[#eee] flex items-center justify-center mb-3">
                  {profile.avatarUrl ? <Image src={profile.avatarUrl} alt="프로필" width={180} height={180} className="w-full h-full object-cover" unoptimized referrerPolicy="no-referrer" /> : <FaUserCircle className="text-8xl text-gray-200" />}
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-indigo-500 mb-1 uppercase tracking-tight">Vibe Space</p>
                  <h2 className="text-base font-black text-gray-900 leading-tight">{profile.displayName}</h2>
                  <p className="text-xs text-indigo-400 mt-0.5 font-mono">@{profile.username}</p>
                </div>
              </div>

              <div className="w-full bg-white/60 border border-gray-300 p-3 rounded-xl mb-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center"><span className="text-gray-500 flex items-center gap-1.5 text-xs"><FaLaptopCode className="text-blue-400" /> 공개 앱</span><span className="font-black text-indigo-600">{publicApps.length}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-500 flex items-center gap-1.5 text-xs"><FaPenFancy className="text-emerald-400" /> 공개 프롬프트</span><span className="font-black text-emerald-600">{publicPrompts.length}</span></div>
                  <div className="flex justify-between items-center cursor-pointer hover:text-amber-600 transition" onClick={() => setActiveTab('guestbook')}><span className="text-gray-500 flex items-center gap-1.5 text-xs"><FaBook className="text-amber-400" /> 방명록</span><span className="font-black text-amber-500">{entries.length > 0 ? entries.length : '✍️'}</span></div>
                </div>
              </div>

              <div className="w-full mt-auto">
                <Link href="/my" className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition">내 스페이스로 →</Link>
              </div>
            </div>

            {/* Center */}
            <div className="flex-1 bg-white shadow-2xl flex flex-col overflow-hidden min-w-0">
              <div className="px-5 pt-4 pb-3 flex-shrink-0 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-bold text-[#4c8bf5]">{profile.displayName} <span className="text-gray-400 font-normal text-base">의 Vibe Space</span></h1>
                  <span className="text-xs font-mono text-gray-300 uppercase">Public Profile</span>
                </div>
              </div>
              <div className="flex-1 px-5 pb-5 pt-4 overflow-y-auto custom-scrollbar">{renderContent()}</div>
            </div>

            {/* Right Tabs */}
            <div className="flex flex-col gap-[2px] pt-8 flex-shrink-0">
              {tabConfig.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`relative px-2.5 py-4 text-xs font-bold transition-all duration-300 rounded-r-xl ${activeTab === tab.key ? `${tab.color} text-white translate-x-1 shadow-lg z-20 w-[60px]` : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200 border-l-0 w-[50px]'}`}>
                  <div className="vertical-text">{tab.label}</div>
                  {activeTab === tab.key && <div className={`absolute left-[-4px] top-0 bottom-0 w-[5px] ${tab.color}`} />}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile */}
          <div className="lg:hidden flex flex-col h-full rounded-2xl overflow-hidden bg-white shadow-xl">
            <div className="flex items-center gap-3 p-3 bg-[#4c8bf5] flex-shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white flex items-center justify-center bg-indigo-300 flex-shrink-0">
                {profile.avatarUrl ? <Image src={profile.avatarUrl} alt="프로필" width={40} height={40} className="w-full h-full object-cover" unoptimized referrerPolicy="no-referrer" /> : <FaUserCircle className="text-white text-2xl" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white font-black text-sm">{profile.displayName}</p>
                <p className="text-blue-100 text-xs font-mono">@{profile.username}</p>
              </div>
            </div>
            <div className="flex border-b border-gray-100 bg-white flex-shrink-0">
              {tabConfig.map(tab => <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 py-3 text-xs font-bold border-b-2 ${activeTab === tab.key ? 'border-[#4c8bf5] text-[#4c8bf5] bg-blue-50' : 'border-transparent text-gray-400'}`}>{tab.menuLabel}</button>)}
            </div>
            <div className="flex-1 overflow-y-auto p-3">{renderContent()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
