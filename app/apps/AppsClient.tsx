'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { AIApp, AppCategory, Collection } from '@/types/database';
import AppCard from '@/components/AppCard';
import Image from 'next/image';
import Link from 'next/link';
import { getCategoryInfo } from '@/lib/categories';
import { useAppCategories } from '@/lib/useCategories';
import { FaArrowUp, FaFire, FaHome, FaPlus, FaRegClock, FaRocket, FaSearch, FaTimes } from 'react-icons/fa';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useOneTimeAccess } from '@/contexts/OneTimeAccessContext';
import PWAInstallButton from '@/components/PWAInstallButton';
import PushNotificationToggle from '@/components/PushNotificationToggle';

type AppsClientProps = {
  initialApps: AIApp[];
  initialCollections?: Collection[];
};

export default function AppsClient({ initialApps, initialCollections = [] }: AppsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [apps, setApps] = useState<AIApp[]>(initialApps);

  const selectedCategory = (searchParams.get('category') as AppCategory | 'all') || 'all';
  const currentPage = Number(searchParams.get('page')) || 1;
  const searchTerm = searchParams.get('search') || '';
  const selectedTag = searchParams.get('tag') || null;

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [searchInput, setSearchInput] = useState(searchTerm);
  const composingRef = useRef(false);
  const searchDebounceRef = useRef<number | null>(null);
  const { categories, loading: loadingCategories } = useAppCategories();
  const itemsPerPage = 24;
  const { user } = useAuth();
  const { isActive: hasOneTimeAccess } = useOneTimeAccess();
  const listTopRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const isFirstMount = useRef(true);

  useEffect(() => { setApps(initialApps); }, [initialApps]);
  useEffect(() => { setSearchInput(searchTerm); }, [searchTerm]);
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const queryString = searchParams.toString();
      const currentFullUrl = queryString ? `${pathname}?${queryString}` : pathname;
      sessionStorage.setItem('lastAppsListUrl', currentFullUrl);
    }
  }, [pathname, searchParams]);

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) params.delete(key);
      else params.set(key, value);
    });
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  const onCategoryChange = (category: AppCategory | 'all') => {
    updateParams({ category, page: '1' });
  };
  const onPageChange = (page: number) => {
    updateParams({ page: Math.max(1, page).toString() });
  };
  const commitSearch = useCallback((term: string) => {
    updateParams({ search: term || null, page: '1' });
  }, [updateParams]);
  const onTagChange = (tag: string | null) => {
    updateParams({ tag: tag || null, page: '1' });
  };

  useEffect(() => {
    if (loadingCategories) return;
    if (selectedCategory === 'all') return;
    if (categories.length === 0) return;
    if (!categories.find((cat) => cat.value === selectedCategory)) {
      onCategoryChange('all');
    }
  }, [categories, selectedCategory, loadingCategories]);

  useEffect(() => {
    const updateVisibility = () => {
      const node = headerRef.current;
      if (!node) { setShowScrollTop(false); return; }
      const rect = node.getBoundingClientRect();
      setShowScrollTop(window.scrollY > rect.bottom + window.scrollY + 50);
    };
    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    window.addEventListener('resize', updateVisibility);
    return () => {
      window.removeEventListener('scroll', updateVisibility);
      window.removeEventListener('resize', updateVisibility);
    };
  }, []);

  const visibleApps = useMemo(() => {
    if (hasOneTimeAccess) return apps;
    const uid = user?.id;
    return apps.filter((app) => (app.isPublic ?? true) || app.createdBy === uid);
  }, [apps, user?.id, hasOneTimeAccess]);

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    visibleApps.forEach(app => { if (app.tags) app.tags.forEach(tag => tagsSet.add(tag)); });
    return Array.from(tagsSet).sort();
  }, [visibleApps]);

  const filteredApps = useMemo(() => {
    let result = visibleApps;
    if (selectedCategory !== 'all') result = result.filter(app => app.category === selectedCategory);
    if (selectedTag) result = result.filter(app => app.tags?.includes(selectedTag));
    const term = searchInput.trim().toLowerCase();
    if (!term) return result;
    return result.filter((app) => {
      const name = app.name.toLowerCase();
      const author = app.createdByName.toLowerCase();
      const desc = app.description.toLowerCase();
      const tags = (app.tags || []).join(' ').toLowerCase();
      return name.includes(term) || author.includes(term) || desc.includes(term) || tags.includes(term);
    });
  }, [visibleApps, selectedCategory, searchInput, selectedTag]);

  const isFiltered = selectedCategory !== 'all' || !!searchTerm || !!selectedTag;

  const popularApps = useMemo(() =>
    [...visibleApps].sort((a, b) => b.likeCount - a.likeCount).slice(0, 10),
    [visibleApps]
  );
  const latestApps = useMemo(() =>
    [...visibleApps].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10),
    [visibleApps]
  );

  const totalPages = Math.ceil(filteredApps.length / itemsPerPage);
  const paginatedApps = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredApps.slice(start, start + itemsPerPage);
  }, [filteredApps, currentPage, itemsPerPage]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) onPageChange(totalPages);
  }, [totalPages, currentPage]);

  useLayoutEffect(() => {
    // 초기 마운트 시에는 무조건 최상단으로 이동 (Next.js 스크롤 복원 방지)
    if (isFirstMount.current) {
      isFirstMount.current = false;
      window.scrollTo({ top: 0 });
      return;
    }
    const node = listTopRef.current;
    if (!node) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
    const scrollToTop = () => {
      const targetTop = node.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: Math.max(0, targetTop), behavior: 'auto' });
    };
    scrollToTop();
    const timeoutId = window.setTimeout(scrollToTop, 80);
    return () => window.clearTimeout(timeoutId);
  }, [currentPage]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const clearAllFilters = () => {
    updateParams({ category: null, search: null, tag: null, page: '1' });
    setSearchInput('');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* Sticky Header */}
      <div ref={headerRef} className="sticky top-0 z-30 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6">

          {/* Top row: breadcrumb + search + register */}
          <div className="flex items-center gap-3 py-4">
            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mr-1">
              <Link href="/" className="hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                <FaHome className="text-xs" />
              </Link>
              <span className="text-gray-300 dark:text-gray-700">/</span>
              <span className="font-bold text-gray-900 dark:text-white">바이브코딩</span>
            </div>

            {/* Search - desktop */}
            <div className="hidden sm:flex flex-1 max-w-xs relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              <input
                value={searchInput}
                onChange={(e) => {
                  const next = e.target.value;
                  setSearchInput(next);
                  if (composingRef.current) return;
                  if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
                  searchDebounceRef.current = window.setTimeout(() => commitSearch(next), 250);
                }}
                onCompositionStart={() => { composingRef.current = true; }}
                onCompositionEnd={(e) => {
                  composingRef.current = false;
                  const next = e.currentTarget.value;
                  setSearchInput(next);
                  if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
                  commitSearch(next);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
                    commitSearch(searchInput);
                  }
                }}
                placeholder="앱 검색"
                className="w-full pl-8 pr-4 py-1.5 text-sm rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-400">
                <FaRocket className="text-blue-500 text-[10px]" />
                {visibleApps.length}개
              </span>
              <PWAInstallButton variant="ghost" size="sm" />
              <Link
                href="/apps/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
              >
                <FaPlus className="text-[10px]" />
                <span className="hidden sm:inline">앱 등록</span>
                <span className="sm:hidden">등록</span>
              </Link>
            </div>
          </div>

          {/* Mobile search */}
          <div className="block sm:hidden pb-3">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              <input
                value={searchInput}
                onChange={(e) => {
                  const next = e.target.value;
                  setSearchInput(next);
                  if (composingRef.current) return;
                  if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
                  searchDebounceRef.current = window.setTimeout(() => commitSearch(next), 250);
                }}
                onCompositionStart={() => { composingRef.current = true; }}
                onCompositionEnd={(e) => {
                  composingRef.current = false;
                  const next = e.currentTarget.value;
                  setSearchInput(next);
                  if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
                  commitSearch(next);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
                    commitSearch(searchInput);
                  }
                }}
                placeholder="앱 이름, 설명, 태그 검색"
                className="w-full pl-8 pr-4 py-2 text-sm rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Push notification banner */}
          {user && (
            <PushNotificationToggle variant="banner" className="mb-2" />
          )}

          {/* Category tabs */}
          <div
            className="flex gap-2 overflow-x-auto pt-1 pb-3"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as CSSProperties}
          >
            <button
              onClick={() => onCategoryChange('all')}
              className={`flex-none px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              전체
            </button>
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = selectedCategory === category.value;
              return (
                <button
                  key={category.value}
                  onClick={() => onCategoryChange(category.value)}
                  className={`flex-none flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? `${category.color} text-white shadow-sm`
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="text-xs" />
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-screen-xl">

        {/* 히어로 배너 */}
        {!isFiltered && (
          <section className="relative mb-8 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-7 sm:p-10">
            {/* 배경 장식 */}
            <div className="absolute top-[-30%] right-[-5%] w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-[-30%] right-[15%] w-48 h-48 bg-purple-400/20 rounded-full blur-xl pointer-events-none" />

            <div className="relative z-10">
              <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-2">
                바이브코딩 · AI LABS
              </p>
              <h1 className="text-white text-2xl sm:text-3xl font-black leading-tight mb-2">
                AI로 만든 앱이 모이는 곳
              </h1>
              <p className="text-white/70 text-sm leading-relaxed max-w-sm mb-5">
                팀원들이 만든 AI 앱을 탐색하고 실행하고, 나만의 앱을 등록해보세요.
              </p>
              <Link
                href="/apps/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-gray-900 text-sm font-bold hover:bg-blue-50 transition-colors shadow-sm"
              >
                <FaPlus className="text-xs" />
                내 앱 등록하기
              </Link>
            </div>
          </section>
        )}

        {/* Active filter chips */}
        {isFiltered && (
          <div className="flex items-center flex-wrap gap-2 mb-5">
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold">
                {getCategoryInfo(selectedCategory as AppCategory, categories).label}
                <button onClick={() => onCategoryChange('all')} className="ml-0.5 hover:text-blue-900 dark:hover:text-blue-100">
                  <FaTimes className="text-[8px]" />
                </button>
              </span>
            )}
            {searchTerm && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-bold">
                &ldquo;{searchTerm}&rdquo;
                <button onClick={() => { commitSearch(''); setSearchInput(''); }} className="ml-0.5 hover:text-gray-900 dark:hover:text-white">
                  <FaTimes className="text-[8px]" />
                </button>
              </span>
            )}
            {selectedTag && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold">
                #{selectedTag}
                <button onClick={() => onTagChange(null)} className="ml-0.5 hover:text-purple-900 dark:hover:text-purple-100">
                  <FaTimes className="text-[8px]" />
                </button>
              </span>
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400">{filteredApps.length}개</span>
            <button
              onClick={clearAllFilters}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              전체 초기화
            </button>
          </div>
        )}

        {/* 에디토리얼 컬렉션 섹션 - Google Play 스타일 */}
        {!isFiltered && initialCollections.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-black text-gray-900 dark:text-white">기획 컬렉션</h2>
              <Link
                href="/apps/collections"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                전체 보기 →
              </Link>
            </div>
            <div
              className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
            >
              {initialCollections.map((col) => (
                <Link
                  key={col.id}
                  href={`/apps/collections/${col.slug}`}
                  className="group flex-none relative w-72 sm:w-80 h-52 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800"
                >
                  {/* 히어로 이미지 배경 */}
                  <CollectionCardImage col={col} />

                  {/* 어두운 오버레이 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* 텍스트 */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    {col.subtitle && (
                      <p className="text-white/70 text-xs font-semibold mb-1 truncate">{col.subtitle}</p>
                    )}
                    <h3 className="text-white font-black text-base leading-tight line-clamp-2">
                      {col.title}
                    </h3>
                    {col.description && (
                      <p className="text-white/60 text-xs mt-1 line-clamp-1">{col.description}</p>
                    )}
                  </div>
                </Link>
              ))}


            </div>
          </section>
        )}

        {/* No-filter sections: Popular + Latest */}
        {!isFiltered && visibleApps.length > 0 && (
          <>
            {/* Popular Apps */}
            {popularApps.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <FaFire className="text-orange-500" />
                  <h2 className="text-base font-black text-gray-900 dark:text-white">인기 앱</h2>
                </div>
                <div
                  className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as CSSProperties}
                >
                  {popularApps.map(app => (
                    <div key={app.id} className="flex-none w-28 sm:w-32">
                      <AppCard app={app} categoryInfo={getCategoryInfo(app.category, categories)} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Latest Apps */}
            {latestApps.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <FaRegClock className="text-blue-500" />
                  <h2 className="text-base font-black text-gray-900 dark:text-white">최신 앱</h2>
                </div>
                <div
                  className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as CSSProperties}
                >
                  {latestApps.map(app => (
                    <div key={app.id} className="flex-none w-28 sm:w-32">
                      <AppCard app={app} categoryInfo={getCategoryInfo(app.category, categories)} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Tag chips */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {allTags.slice(0, 15).map(tag => (
              <button
                key={tag}
                onClick={() => onTagChange(selectedTag === tag ? null : tag)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  selectedTag === tag
                    ? 'bg-purple-600 text-white border-transparent'
                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* All Apps Grid */}
        <section>
          <div ref={listTopRef} />
          {!isFiltered && visibleApps.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-base font-black text-gray-900 dark:text-white">
                전체 앱
                <span className="ml-2 text-sm font-normal text-gray-400">({visibleApps.length})</span>
              </h2>
            </div>
          )}

          {paginatedApps.length === 0 ? (
            <div className="text-center py-24 animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <FaRocket className="text-white text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">
                {isFiltered ? '검색 결과가 없습니다' : '등록된 앱이 없습니다'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {isFiltered ? '다른 검색어나 카테고리를 시도해보세요' : '첫 번째 앱을 등록해보세요!'}
              </p>
              {isFiltered && (
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 rounded-full text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition"
                >
                  필터 초기화
                </button>
              )}
            </div>
          ) : (
            <div className="animate-fadeIn grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
              {paginatedApps.map((app) => (
                <AppCard key={app.id} app={app} categoryInfo={getCategoryInfo(app.category, categories)} />
              ))}
            </div>
          )}
        </section>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-10 mt-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-full text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              ← 이전
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const page = totalPages <= 7 ? i + 1 : (
                currentPage <= 4 ? i + 1 :
                currentPage >= totalPages - 3 ? totalPages - 6 + i :
                currentPage - 3 + i
              );
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                    page === currentPage
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-full text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              다음 →
            </button>
          </div>
        )}
      </div>

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 w-10 h-10 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xl flex items-center justify-center hover:scale-110 transition-transform z-50"
        >
          <FaArrowUp className="text-xs" />
        </button>
      )}

      <Footer />
    </div>
  );
}

function resolveImageUrl(url: string): string {
  // drive.google.com/file/d/{id}/view 또는 /d/{id}/view → thumbnail URL로 변환
  const fileMatch = url.match(/drive\.google\.com\/(?:file\/)?d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch && !url.includes('thumbnail')) {
    return `https://drive.google.com/thumbnail?id=${fileMatch[1]}&sz=w1600`;
  }
  if (url.includes('drive.google.com/thumbnail') && !url.includes('sz=')) {
    return url + '&sz=w1600';
  }
  return url;
}

function CollectionCardImage({ col }: { col: Collection }) {
  const [imgError, setImgError] = useState(false);
  const imageUrl = col.heroImageUrl || col.cardImageUrl;

  if (!imageUrl || imgError) return null;

  return (
    <Image
      src={resolveImageUrl(imageUrl)}
      alt={col.title}
      fill
      className="object-cover transition-transform duration-500 group-hover:scale-105"
      sizes="(max-width: 640px) 288px, 320px"
      onError={() => setImgError(true)}
    />
  );
}
