'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import type { AIApp, AppCategory, Prompt } from '@/types/database';
import {
  FaArrowLeft,
  FaCrown,
  FaEnvelope,
  FaHeart,
  FaIdCard,
  FaLaptopCode,
  FaPenFancy,
  FaRegClock,
  FaDownload,
  FaSpinner,
  FaUser,
  FaList,
  FaThLarge,
} from 'react-icons/fa';
import AppCard from '@/components/AppCard';
import PromptCard from '@/components/PromptCard';
import { useSearchParams, useRouter } from 'next/navigation';
import { getCategoryInfo } from '@/lib/categories';
import { getPromptCategoryInfo } from '@/lib/promptCategories';
import { useAppCategories, usePromptCategories } from '@/lib/useCategories';
import * as XLSX from 'xlsx';

type MyPageClientProps = {
  initialUserId: string | null;
  initialMyApps: AIApp[];
  initialMyPrompts: Prompt[];
  initialLikedApps: AIApp[];
  initialLikedPrompts: Prompt[];
};

const MyPageInner = dynamic(() => Promise.resolve(MyPageContent), {
  ssr: false,
  loading: () => <div className="py-12 text-center text-gray-500 dark:text-gray-400">로딩 중...</div>,
});

export default function MyPageClient(props: MyPageClientProps) {
  return <MyPageInner {...props} />;
}

function MyPageContent({
  initialUserId,
  initialMyApps,
  initialMyPrompts,
  initialLikedApps,
  initialLikedPrompts,
}: MyPageClientProps) {
  const router = useRouter();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const { categories: appCategories } = useAppCategories();
  const { categories: promptCategories } = usePromptCategories();
  const [myApps, setMyApps] = useState<AIApp[]>(initialMyApps);
  const [likedApps, setLikedApps] = useState<AIApp[]>(initialLikedApps);
  const [myPrompts, setMyPrompts] = useState<Prompt[]>(initialMyPrompts);
  const [likedPrompts, setLikedPrompts] = useState<Prompt[]>(initialLikedPrompts);
  const [activeTab, setActiveTab] = useState<'apps' | 'prompts' | 'likes' | 'likedPrompts'>('apps');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const searchParams = useSearchParams();

  useEffect(() => {
    setMyApps(initialMyApps);
    setMyPrompts(initialMyPrompts);
    setLikedApps(initialLikedApps);
    setLikedPrompts(initialLikedPrompts);
  }, [initialMyApps, initialMyPrompts, initialLikedApps, initialLikedPrompts]);

  useEffect(() => {
    if (authLoading) return;
    const currentUserId = user?.id ?? null;
    if (currentUserId !== initialUserId) {
      router.refresh();
    }
  }, [authLoading, user?.id, initialUserId, router]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'prompts' || tab === 'likes' || tab === 'apps' || tab === 'likedPrompts') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const formatDate = (value?: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  const formatExportDate = (value?: Date | null) => {
    if (!value) return '';
    return value.toISOString();
  };

  const buildAppExportRows = (apps: AIApp[]) =>
    apps.map((app) => {
      const categoryInfo = getCategoryInfo(app.category, appCategories);
      return {
        '앱 ID': app.id,
        '앱 이름': app.name,
        '설명': app.description,
        '카테고리': categoryInfo.label,
        '앱 URL': app.appUrls?.[0]?.url || '',
        'SNS URL': app.snsUrls.join(' | '),
        '공개 여부': app.isPublic ? '공개' : '비공개',
        '작성자': app.createdByName,
        '작성자 UID': app.createdBy,
        '등록일': formatExportDate(app.createdAt),
        '수정일': formatExportDate(app.updatedAt),
        '좋아요 수': app.likeCount,
        '썸네일 URL': app.thumbnailUrl || '',
        '첨부파일': app.attachments.map((file) => `${file.name} (${file.storagePath})`).join(' | ')
      };
    });

  const buildPromptExportRows = (prompts: Prompt[]) =>
    prompts.map((prompt) => {
      const categoryInfo = getPromptCategoryInfo(prompt.category, promptCategories);
      return {
        '프롬프트 ID': prompt.id,
        '프롬프트 이름': prompt.name,
        '설명': prompt.description,
        '카테고리': categoryInfo.label,
        '프롬프트 본문': prompt.promptContent,
        'SNS URL': prompt.snsUrls.join(' | '),
        '공개 여부': prompt.isPublic ? '공개' : '비공개',
        '작성자': prompt.createdByName,
        '작성자 UID': prompt.createdBy,
        '등록일': formatExportDate(prompt.createdAt),
        '수정일': formatExportDate(prompt.updatedAt),
        '좋아요 수': prompt.likeCount,
        '썸네일 URL': prompt.thumbnailUrl || '',
        '첨부파일': prompt.attachments.map((file) => `${file.name} (${file.storagePath})`).join(' | ')
      };
    });

  const downloadBlob = (content: BlobPart, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportApps = (apps: AIApp[], format: 'csv' | 'xlsx', filenamePrefix: string) => {
    if (apps.length === 0) return;
    const rows = buildAppExportRows(apps);
    const dateStamp = new Date().toISOString().slice(0, 10);
    if (format === 'csv') {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      downloadBlob(csv, `${filenamePrefix}-${dateStamp}.csv`, 'text/csv;charset=utf-8');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'apps');
    const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    downloadBlob(data, `${filenamePrefix}-${dateStamp}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };

  const exportPrompts = (prompts: Prompt[], format: 'csv' | 'xlsx', filenamePrefix: string) => {
    if (prompts.length === 0) return;
    const rows = buildPromptExportRows(prompts);
    const dateStamp = new Date().toISOString().slice(0, 10);
    if (format === 'csv') {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      downloadBlob(csv, `${filenamePrefix}-${dateStamp}.csv`, 'text/csv;charset=utf-8');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'prompts');
    const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    downloadBlob(data, `${filenamePrefix}-${dateStamp}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };

  const stats = useMemo(
    () => [
      { key: 'apps', label: '내 앱', value: myApps.length, icon: FaLaptopCode, color: 'from-blue-500 to-purple-500' },
      { key: 'prompts', label: '내 프롬프트', value: myPrompts.length, icon: FaPenFancy, color: 'from-emerald-500 to-teal-500' },
      { key: 'likes', label: '좋아요한 앱', value: likedApps.length, icon: FaHeart, color: 'from-rose-500 to-pink-500' },
      { key: 'likedPrompts', label: '좋아요한 프롬프트', value: likedPrompts.length, icon: FaHeart, color: 'from-orange-500 to-amber-500' },
    ],
    [myApps.length, myPrompts.length, likedApps.length, likedPrompts.length]
  );

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
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">로그인이 필요합니다</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">마이페이지를 보려면 Google 계정으로 로그인해주세요.</p>
        <button
          onClick={signInWithGoogle}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Google 로그인
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-6xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6">
          <FaArrowLeft />
          홈으로
        </Link>

        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
                {user.user_metadata?.avatar_url ? (
                  <Image src={user.user_metadata.avatar_url} alt="프로필" width={56} height={56} className="rounded-full" unoptimized referrerPolicy="no-referrer" />
                ) : (
                  <FaUser />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user.user_metadata?.full_name || user.user_metadata?.name || '사용자'}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <FaEnvelope />
                  <span>{user.email}</span>
                  <span className="text-gray-300 dark:text-gray-700">•</span>
                  <FaIdCard />
                  <span>{user.id.slice(0, 8)}...</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => exportApps(myApps, 'csv', 'my-apps')}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <FaDownload /> 내 앱 CSV
              </button>
              <button
                onClick={() => exportPrompts(myPrompts, 'csv', 'my-prompts')}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <FaDownload /> 내 프롬프트 CSV
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {stats.map((stat) => (
              <button
                key={stat.key}
                onClick={() => setActiveTab(stat.key as typeof activeTab)}
                className={`rounded-2xl border border-gray-200 dark:border-gray-800 p-4 text-left transition ${activeTab === stat.key
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                  <stat.icon />
                  {stat.label}
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('card')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition ${viewMode === 'card'
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
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition ${viewMode === 'list'
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

        {/* 컨텐츠 */}
        <div className="space-y-10">
          {activeTab === 'apps' && (
            <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FaLaptopCode className="text-blue-500" /> 내 앱
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href="/apps/new" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">새 앱 등록</Link>
                    {myApps.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => exportApps(myApps, 'csv', 'my-apps')}
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <FaDownload />
                          CSV 전체
                        </button>
                        <button
                          type="button"
                          onClick={() => exportApps(myApps, 'xlsx', 'my-apps')}
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <FaDownload />
                          XLSX 전체
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {myApps.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl">
                    <p className="text-gray-500 dark:text-gray-400">등록한 앱이 없습니다.</p>
                  </div>
                ) : viewMode === 'card' ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                    {myApps.map((app) => (
                      <AppCard key={app.id} app={app} categoryInfo={getCategoryInfo(app.category, appCategories)} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myApps.map((app) => {
                      const categoryInfo = getCategoryInfo(app.category, appCategories);
                      const CategoryIcon = categoryInfo.icon;
                      return (
                        <Link
                          key={app.id}
                          href={`/apps/${app.id}`}
                          className="flex items-center justify-between p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-md transition"
                        >
                          <div className="min-w-0 flex-1 mr-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{categoryInfo.label}</p>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{app.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">{app.description}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <CategoryIcon className="text-lg text-blue-500" />
                            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r text-white whitespace-nowrap ${appBadgeTone(app.category)}`}>
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
                    <FaPenFancy className="text-emerald-500" /> 내 프롬프트
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href="/prompts/new" className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">새 프롬프트 등록</Link>
                    {myPrompts.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => exportPrompts(myPrompts, 'csv', 'my-prompts')}
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <FaDownload />
                          CSV 전체
                        </button>
                        <button
                          type="button"
                          onClick={() => exportPrompts(myPrompts, 'xlsx', 'my-prompts')}
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <FaDownload />
                          XLSX 전체
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {myPrompts.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl">
                    <p className="text-gray-500 dark:text-gray-400">등록한 프롬프트가 없습니다.</p>
                  </div>
                ) : viewMode === 'card' ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                    {myPrompts.map((prompt) => (
                      <PromptCard key={prompt.id} prompt={prompt} categoryInfo={getPromptCategoryInfo(prompt.category, promptCategories)} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myPrompts.map((prompt) => {
                      const categoryInfo = getPromptCategoryInfo(prompt.category, promptCategories);
                      const CategoryIcon = categoryInfo.icon;
                      return (
                        <Link
                          key={prompt.id}
                          href={`/prompts/${prompt.id}`}
                          className="flex items-center justify-between p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-md transition"
                        >
                          <div className="min-w-0 flex-1 mr-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{categoryInfo.label}</p>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{prompt.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">{prompt.description}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <CategoryIcon className="text-lg text-emerald-500" />
                            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r text-white whitespace-nowrap ${promptBadgeTone(prompt.category)}`}>
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
                </div>

                {likedApps.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl">
                    <p className="text-gray-500 dark:text-gray-400">좋아요한 앱이 없습니다.</p>
                  </div>
                ) : viewMode === 'card' ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                    {likedApps.map((app) => (
                      <AppCard key={app.id} app={app} categoryInfo={getCategoryInfo(app.category, appCategories)} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {likedApps.map((app) => {
                      const categoryInfo = getCategoryInfo(app.category, appCategories);
                      const CategoryIcon = categoryInfo.icon;
                      return (
                        <Link
                          key={app.id}
                          href={`/apps/${app.id}`}
                          className="flex items-center justify-between p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-md transition"
                        >
                          <div className="min-w-0 flex-1 mr-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{categoryInfo.label}</p>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{app.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">{app.description}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <CategoryIcon className="text-lg text-rose-500" />
                            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r text-white whitespace-nowrap ${appBadgeTone(app.category)}`}>
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

          {activeTab === 'likedPrompts' && (
            <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FaHeart className="text-orange-500" /> 좋아요한 프롬프트
                  </h2>
                </div>

                {likedPrompts.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl">
                    <p className="text-gray-500 dark:text-gray-400">좋아요한 프롬프트가 없습니다.</p>
                  </div>
                ) : viewMode === 'card' ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                    {likedPrompts.map((prompt) => (
                      <PromptCard key={prompt.id} prompt={prompt} categoryInfo={getPromptCategoryInfo(prompt.category, promptCategories)} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {likedPrompts.map((prompt) => {
                      const categoryInfo = getPromptCategoryInfo(prompt.category, promptCategories);
                      const CategoryIcon = categoryInfo.icon;
                      return (
                        <Link
                          key={prompt.id}
                          href={`/prompts/${prompt.id}`}
                          className="flex items-center justify-between p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-md transition"
                        >
                          <div className="min-w-0 flex-1 mr-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{categoryInfo.label}</p>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{prompt.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">{prompt.description}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <CategoryIcon className="text-lg text-orange-500" />
                            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r text-white whitespace-nowrap ${promptBadgeTone(prompt.category)}`}>
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
      </div>
    </div>
  );
}
