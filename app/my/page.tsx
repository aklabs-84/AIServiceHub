'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AIApp, AppCategory } from '@/types/app';
import { Prompt } from '@/types/prompt';
import {
  FaArrowLeft,
  FaCrown,
  FaEnvelope,
  FaHeart,
  FaIdCard,
  FaLaptopCode,
  FaPenFancy,
  FaRegClock,
  FaSpinner,
  FaUser,
  FaList,
  FaThLarge
} from 'react-icons/fa';
import AppCard from '@/components/AppCard';
import PromptCard from '@/components/PromptCard';
import { getAppsByUser, getLikedAppsByUser, getPromptsByUser } from '@/lib/db';
import { useSearchParams } from 'next/navigation';
import { getCategoryInfo } from '@/lib/categories';
import { getPromptCategoryInfo } from '@/lib/promptCategories';

export default function MyPage() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [myApps, setMyApps] = useState<AIApp[]>([]);
  const [likedApps, setLikedApps] = useState<AIApp[]>([]);
  const [myPrompts, setMyPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'apps' | 'prompts' | 'likes'>('apps');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const searchParams = useSearchParams();
  const formatDate = (value?: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'prompts' || tab === 'likes' || tab === 'apps') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [apps, prompts, likes] = await Promise.all([
          getAppsByUser(user.uid),
          getPromptsByUser(user.uid),
          getLikedAppsByUser(user.uid),
        ]);
        setMyApps(apps);
        setMyPrompts(prompts);
        setLikedApps(likes);
      } catch (error) {
        console.error('Error loading my page data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const stats = useMemo(() => (
    [
      { key: 'apps', label: '내 앱', value: myApps.length, icon: FaLaptopCode, color: 'from-blue-500 to-purple-500' },
      { key: 'prompts', label: '내 프롬프트', value: myPrompts.length, icon: FaPenFancy, color: 'from-emerald-500 to-teal-500' },
      { key: 'likes', label: '좋아요한 앱', value: likedApps.length, icon: FaHeart, color: 'from-rose-500 to-pink-500' },
    ]
  ), [myApps.length, myPrompts.length, likedApps.length]);

  const appBadgeTone = (category: AppCategory) => {
    switch (category) {
      case 'chatbot':
        return 'from-blue-400 via-blue-500 to-blue-600';
      case 'content-generation':
        return 'from-purple-400 via-purple-500 to-purple-600';
      case 'data-analysis':
        return 'from-emerald-400 via-emerald-500 to-emerald-600';
      case 'image-generation':
        return 'from-pink-400 via-pink-500 to-pink-600';
      case 'code-assistant':
        return 'from-amber-300 via-amber-400 to-amber-500';
      case 'translation':
        return 'from-indigo-400 via-indigo-500 to-indigo-600';
      case 'education':
        return 'from-red-400 via-red-500 to-red-600';
      case 'game':
        return 'from-orange-400 via-orange-500 to-orange-600';
      case 'productivity':
        return 'from-teal-400 via-teal-500 to-teal-600';
      case 'other':
      default:
        return 'from-gray-200 via-gray-300 to-gray-400 dark:from-gray-700 dark:via-gray-800 dark:to-gray-900';
    }
  };

  const promptBadgeTone = (category: Prompt['category']) => {
    switch (category) {
      case 'daily':
        return 'from-emerald-300 via-teal-400 to-emerald-500';
      case 'work':
        return 'from-blue-400 via-sky-500 to-blue-600';
      case 'fun':
        return 'from-purple-400 via-fuchsia-500 to-pink-500';
      case 'relationship':
        return 'from-rose-400 via-pink-500 to-red-500';
      case 'education':
        return 'from-amber-400 via-orange-500 to-yellow-400';
      default:
        return 'from-slate-200 via-slate-300 to-slate-400 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900';
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-600 dark:text-gray-300">
        <FaSpinner className="animate-spin text-3xl mb-3" />
        <p>로그인 상태를 확인하는 중...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white mb-6 shadow-lg">
          <FaLaptopCode className="text-3xl" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">로그인 후 이용해 주세요</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">내가 만든 앱, 작성한 프롬프트, 좋아요한 앱을 한 번에 볼 수 있어요.</p>
        <button
          onClick={signInWithGoogle}
          className="px-6 py-3 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 font-semibold shadow hover:-translate-y-0.5 transition"
        >
          Google로 로그인
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="flex items-center gap-3 mb-6 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/" className="inline-flex items-center gap-2 hover:text-gray-800 dark:hover:text-gray-200">
          <FaArrowLeft />
          홈으로
        </Link>
      </div>

      <div className="flex flex-col gap-6 mb-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">마이페이지</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">{user.displayName || '나의 대시보드'}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">내 정보와 내가 만든 것을 한 곳에서 관리하세요.</p>
          </div>
          <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 shadow">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || '사용자'} className="w-12 h-12 rounded-full border-2 border-blue-500" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl">
                <FaUser />
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">환영합니다!</p>
              <p className="font-semibold text-gray-900 dark:text-white">{user.displayName || '사용자'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="col-span-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">기본 정보</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                <FaEnvelope className="text-blue-500" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">이메일</p>
                  <p className="font-medium text-gray-900 dark:text-white truncate">{user.email || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                <FaIdCard className="text-emerald-500" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">UID</p>
                  <p className="font-medium text-gray-900 dark:text-white truncate">{user.uid}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                <FaRegClock className="text-purple-500" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">가입일</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formatDate(user.metadata?.creationTime)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                <FaRegClock className="text-orange-500" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">최근 로그인</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formatDate(user.metadata?.lastSignInTime)}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">멤버십</h3>
              <FaCrown className="text-amber-400" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">현재 플랜: <span className="font-semibold text-gray-900 dark:text-white">Free</span></p>
            <p className="text-sm text-gray-600 dark:text-gray-400">유료 멤버십으로 더 많은 기능을 준비 중입니다.</p>
            <button className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 font-semibold shadow hover:shadow-lg transition">
              업그레이드 알림 받기
            </button>
          </div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key as typeof activeTab)}
                className={`group flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-4 shadow hover:-translate-y-0.5 transition ${isActive ? 'ring-2 ring-offset-2 ring-blue-400 dark:ring-offset-gray-900' : ''}`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center shadow-inner`}>
                  <Icon />
                </div>
                <div className="text-left">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{item.value}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end">
          <div className="inline-flex rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
            <button
              onClick={() => setViewMode('card')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition ${
                viewMode === 'card'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              aria-pressed={viewMode === 'card'}
            >
              <FaThLarge />
              <span>카드형</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition ${
                viewMode === 'list'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              aria-pressed={viewMode === 'list'}
            >
              <FaList />
              <span>리스트형</span>
            </button>
          </div>
        </div>
      </div>

      {/* 컨텐츠 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-600 dark:text-gray-300">
          <FaSpinner className="animate-spin text-3xl mb-3" />
          <p>불러오는 중...</p>
        </div>
      ) : (
        <div className="space-y-10">
          {activeTab === 'apps' && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FaLaptopCode className="text-blue-500" /> 내 앱
                </h2>
                <Link href="/apps/new" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">새 앱 등록</Link>
              </div>
              {myApps.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">아직 등록한 앱이 없습니다.</p>
              ) : viewMode === 'card' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {myApps.map((app, index) => (
                    <div key={app.id} style={{ animationDelay: `${index * 0.05}s` }} className="animate-fadeIn">
                      <AppCard app={app} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {myApps.map((app, index) => {
                    const categoryInfo = getCategoryInfo(app.category);
                    const CategoryIcon = categoryInfo.icon;
                    return (
                      <Link
                        key={app.id}
                        href={`/apps/${app.id}`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                        className="group flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 sm:px-5 py-3 sm:py-4 shadow-sm hover:shadow-md transition hover:-translate-y-0.5 animate-fadeIn"
                      >
                        <div className={`h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center rounded-xl bg-gradient-to-br ${appBadgeTone(app.category)} text-white shadow-inner`}>
                          <CategoryIcon className="text-lg sm:text-xl" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {app.name}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <FaUser className="text-purple-500 dark:text-purple-400" />
                            <span className="truncate">{app.createdByName}</span>
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">
                            {categoryInfo.label}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {activeTab === 'prompts' && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FaPenFancy className="text-emerald-500" /> 내가 만든 프롬프트
                </h2>
                <Link href="/prompts/new" className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">새 프롬프트 등록</Link>
              </div>
              {myPrompts.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">아직 작성한 프롬프트가 없습니다.</p>
              ) : viewMode === 'card' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {myPrompts.map((prompt, index) => (
                    <div key={prompt.id} style={{ animationDelay: `${index * 0.05}s` }} className="animate-fadeIn">
                      <PromptCard prompt={prompt} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {myPrompts.map((prompt, index) => {
                    const categoryInfo = getPromptCategoryInfo(prompt.category);
                    const CategoryIcon = categoryInfo.icon;
                    return (
                      <Link
                        key={prompt.id}
                        href={`/prompts/${prompt.id}`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                        className="group flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 sm:px-5 py-3 sm:py-4 shadow-sm hover:shadow-md transition hover:-translate-y-0.5 animate-fadeIn"
                      >
                        <div className={`h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center rounded-xl bg-gradient-to-br ${promptBadgeTone(prompt.category)} text-white shadow-inner`}>
                          <CategoryIcon className="text-lg sm:text-xl" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                            {prompt.name}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <FaUser className="text-emerald-500" />
                            <span className="truncate">{prompt.createdByName}</span>
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">
                            {categoryInfo.label}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {activeTab === 'likes' && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FaHeart className="text-rose-500" /> 좋아요한 앱
                </h2>
                <Link href="/apps" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">앱 둘러보기</Link>
              </div>
              {likedApps.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">아직 좋아요한 앱이 없습니다.</p>
              ) : viewMode === 'card' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {likedApps.map((app, index) => (
                    <div key={app.id} style={{ animationDelay: `${index * 0.05}s` }} className="animate-fadeIn">
                      <AppCard app={app} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {likedApps.map((app, index) => {
                    const categoryInfo = getCategoryInfo(app.category);
                    const CategoryIcon = categoryInfo.icon;
                    return (
                      <Link
                        key={app.id}
                        href={`/apps/${app.id}`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                        className="group flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 sm:px-5 py-3 sm:py-4 shadow-sm hover:shadow-md transition hover:-translate-y-0.5 animate-fadeIn"
                      >
                        <div className={`h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center rounded-xl bg-gradient-to-br ${appBadgeTone(app.category)} text-white shadow-inner`}>
                          <CategoryIcon className="text-lg sm:text-xl" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {app.name}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <FaUser className="text-purple-500 dark:text-purple-400" />
                            <span className="truncate">{app.createdByName}</span>
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">
                            {categoryInfo.label}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
