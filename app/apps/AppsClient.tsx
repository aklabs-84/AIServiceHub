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
    <div className="min-h-screen bg-white dark:bg-gray-950">

      {/* Hero Section */}
      {!isFiltered && (
        <section className="relative bg-white dark:bg-gray-950 pb-6 sm:pb-10 overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 sm:p-12 shadow-2xl">
              {/* Background Decorations */}
              <div className="absolute top-[-20%] right-[-10%] w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-[-20%] right-[20%] w-64 h-64 bg-purple-400/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute top-[10%] left-[5%] w-32 h-32 bg-blue-300/10 rounded-full blur-xl pointer-events-none" />

              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-8">
                <div className="max-w-xl text-center sm:text-left">
                  <p className="text-blue-100 text-xs sm:text-sm font-black uppercase tracking-widest mb-3 opacity-90">
                    바이브코딩 · AI LABS EXPLORER
                  </p>
                  <h1 className="text-white text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.1] mb-4 tracking-tighter">
                    AI로 만든 앱이 <br className="hidden sm:block" />모이는 곳
                  </h1>
                  <p className="text-white/80 text-sm sm:text-base leading-relaxed mb-6 font-medium">
                    팀원들이 직접 기획하고 제작한 AI 앱을 탐색해보세요.<br className="hidden sm:block" />
                    아이디어를 실행하고, 나만의 앱을 등록하여 공유할 수 있습니다.
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                    <Link
                      href="/apps/new"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-blue-700 text-sm sm:text-base font-black hover:bg-blue-50 transition-all shadow-xl hover:scale-105 active:scale-95"
                    >
                      <FaPlus className="text-xs" />
                      내 앱 등록하기
                    </Link>
                    <div className="hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-bold">
                      <FaRocket className="text-blue-300" />
                      <span>{visibleApps.length}개의 혁신적인 앱</span>
                    </div>
                  </div>
                </div>
                
                {/* Hero Stats/Icon for visual balance */}
                <div className="hidden lg:block relative">
                   <div className="w-48 h-48 rounded-[40px] bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center p-8 animate-float">
                      <FaRocket className="text-white text-7xl opacity-80" />
                   </div>
                   <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-3xl bg-blue-500 shadow-xl flex items-center justify-center text-white text-3xl animate-bounce-slow">
                      <FaFire />
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* [Sticky Combined Navigation] */}
      <div 
        ref={headerRef} 
        className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 transition-all duration-300 shadow-sm"
      >
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 sm:py-4">
            
            {/* Search + Category integration row */}
            <div className="flex items-center flex-1 gap-4 overflow-hidden">
               {/* Search bar */}
               <div className="relative flex-none w-full sm:w-64 lg:w-80 group">
                  <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs transition-colors group-focus-within:text-blue-500" />
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
                    placeholder="앱 이름, 설명 검색..."
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 transition-all font-medium"
                  />
               </div>

               {/* Category Badges (Horizontal scroll) */}
               <div 
                 className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar scroll-smooth"
                 style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as CSSProperties}
               >
                 <button
                   onClick={() => onCategoryChange('all')}
                   className={`flex-none px-4 py-2 rounded-xl text-xs font-black transition-all ${
                     selectedCategory === 'all'
                       ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md'
                       : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700'
                   }`}
                 >
                   ALL
                 </button>
                 {categories.map((category) => {
                   const Icon = category.icon;
                   const isActive = selectedCategory === category.value;
                   return (
                     <button
                       key={category.value}
                       onClick={() => onCategoryChange(category.value)}
                       className={`flex-none flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                         isActive
                           ? `${category.color} text-white shadow-md active:scale-95`
                           : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700'
                       }`}
                     >
                       <Icon className="text-[10px]" />
                       {category.label}
                     </button>
                   );
                 })}
               </div>
            </div>

            {/* Mobile-only divider line if needed or Register button */}
            <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-gray-100 dark:border-gray-800">
               <Link
                href="/apps/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 dark:bg-blue-600 text-white text-xs font-black hover:bg-black dark:hover:bg-blue-700 transition-all shadow-sm active:scale-95"
               >
                 <FaPlus className="text-[10px]" />
                 <span>APP 등록</span>
               </Link>
            </div>
          </div>
        </div>
      </div>

      {/* [Active Filter Chips] */}
      {isFiltered && (
        <div className="bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800">
          <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center flex-wrap gap-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">ACTIVE FILTERS:</span>
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[11px] font-black shadow-sm">
                {getCategoryInfo(selectedCategory as AppCategory, categories).label}
                <button onClick={() => onCategoryChange('all')} className="hover:text-blue-900 bg-white/20 rounded-full p-0.5">
                  <FaTimes className="text-[8px]" />
                </button>
              </span>
            )}
            {searchTerm && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[11px] font-black">
                &ldquo;{searchTerm}&rdquo;
                <button onClick={() => { commitSearch(''); setSearchInput(''); }} className="hover:text-gray-900 bg-white/20 rounded-full p-0.5">
                  <FaTimes className="text-[8px]" />
                </button>
              </span>
            )}
            {selectedTag && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[11px] font-black">
                #{selectedTag}
                <button onClick={() => onTagChange(null)} className="hover:text-purple-900 bg-white/20 rounded-full p-0.5">
                  <FaTimes className="text-[8px]" />
                </button>
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="ml-auto text-[11px] font-black text-blue-600 hover:text-blue-800 transition-colors"
            >
              RESET ALL
            </button>
          </div>
        </div>
      )}

      {/* [Sections] */}
      <main>
        {/* Editorial Collections */}
        {!isFiltered && initialCollections.length > 0 && (
          <section className="bg-white dark:bg-gray-950 py-10 sm:py-14">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col gap-1">
                   <h2 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white tracking-tighter">기획 컬렉션</h2>
                   <p className="text-xs sm:text-sm font-medium text-gray-500">에디터가 엄선한 테마별 AI 앱 꾸러미</p>
                </div>
                <Link
                  href="/apps/collections"
                  className="px-4 py-2 rounded-xl text-xs font-black text-blue-600 border border-blue-100 hover:bg-blue-50 transition-all"
                >
                  전체 보기
                </Link>
              </div>
              <div
                className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth items-center"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
              >
                {initialCollections.map((col) => (
                  <Link
                    key={col.id}
                    href={`/apps/collections/${col.slug}`}
                    className="group flex-none relative w-[80vw] sm:w-[500px] h-64 sm:h-72 rounded-[32px] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 bg-gray-900"
                  >
                    <CollectionCardImage col={col} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-80 transition-opacity group-hover:opacity-90" />
                    <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-10 pointer-events-none">
                      {col.subtitle && (
                        <p className="text-blue-400 text-xs sm:text-sm font-black mb-2 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">{col.subtitle}</p>
                      )}
                      <h3 className="text-white font-black text-xl sm:text-2xl leading-tight mb-2 tracking-tight group-hover:scale-105 transition-transform origin-left duration-500">
                        {col.title}
                      </h3>
                      {col.description && (
                        <p className="text-white/60 text-xs sm:text-sm font-medium line-clamp-2 max-w-[90%] opacity-0 group-hover:opacity-100 transition-opacity duration-700">{col.description}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Popular & Latest - List Layout */}
        {!isFiltered && visibleApps.length > 0 && (
          <section className="bg-gray-50/80 dark:bg-gray-900/50 py-12 sm:py-16 border-y border-gray-100 dark:border-gray-800">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-x-16 lg:gap-y-0">
                 
                 {/* Popular List (List Layout) */}
                 <div className="space-y-6 sm:space-y-8">
                    <div className="flex items-center justify-between px-2">
                       <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                             <FaFire className="text-orange-600 dark:text-orange-400 text-sm" />
                          </div>
                          <h2 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white tracking-tighter uppercase">Popular Apps</h2>
                       </div>
                       <span className="text-[10px] font-black text-gray-400 tracking-widest bg-white dark:bg-gray-800 px-2 py-1 rounded-md shadow-sm">TOP 10</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                       {popularApps.slice(0, 5).map((app, idx) => (
                         <AppCard 
                           key={app.id} 
                           app={app} 
                           variant="list" 
                           rank={idx + 1}
                           categoryInfo={getCategoryInfo(app.category, categories)} 
                         />
                       ))}
                    </div>
                 </div>

                 {/* Latest List (List Layout) */}
                 <div className="space-y-6 sm:space-y-8 mt-12 lg:mt-0">
                    <div className="flex items-center justify-between px-2">
                       <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                             <FaRegClock className="text-blue-600 dark:text-blue-400 text-sm" />
                          </div>
                          <h2 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white tracking-tighter uppercase">New Arrivals</h2>
                       </div>
                       <span className="text-[10px] font-black text-gray-400 tracking-widest bg-white dark:bg-gray-800 px-2 py-1 rounded-md shadow-sm">LATEST 5</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                       {latestApps.slice(0, 5).map((app) => (
                         <AppCard 
                           key={app.id} 
                           app={app} 
                           variant="list" 
                           categoryInfo={getCategoryInfo(app.category, categories)} 
                         />
                       ))}
                    </div>
                 </div>
              </div>
            </div>
          </section>
        )}

        {/* Explorer Section (All Apps Grid) */}
        <section className="bg-white dark:bg-gray-950 py-12 sm:py-16">
          <div className="container mx-auto px-4 sm:px-6">
            <div ref={listTopRef} />
            
            {/* Exploration Header with Tags */}
            <div className="mb-10">
               <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
                  <div className="flex flex-col gap-1.5">
                     <h2 className="text-2xl sm:text-3xl font-black text-gray-950 dark:text-white tracking-tighter">
                        {isFiltered ? '검색 결과' : 'AI 전용 앱 탐색'}
                        <span className="ml-3 text-sm sm:text-lg font-black text-blue-500 opacity-60">
                          ({filteredApps.length})
                        </span>
                     </h2>
                     <div className="flex items-center gap-2">
                        <span className="inline-block w-8 h-1 bg-blue-500 rounded-full" />
                        <p className="text-xs sm:text-sm font-bold text-gray-400">다양한 태그와 카테고리로 필터링해보세요</p>
                     </div>
                  </div>
               </div>

               {/* Integrated Tag Chips */}
               {allTags.length > 0 && (
                 <div className="flex flex-wrap items-center gap-2 p-4 rounded-3xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
                    <span className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mr-2 px-1">TAGS:</span>
                    {allTags.slice(0, 20).map(tag => (
                      <button
                        key={tag}
                        onClick={() => onTagChange(selectedTag === tag ? null : tag)}
                        className={`px-4 py-2 rounded-xl text-[11px] sm:text-xs font-black transition-all border ${
                          selectedTag === tag
                            ? 'bg-blue-600 text-white border-transparent shadow-md scale-105'
                            : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-600'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                 </div>
               )}
            </div>

            {/* Grid Area */}
            {paginatedApps.length === 0 ? (
              <div className="text-center py-32 rounded-[40px] border-2 border-dashed border-gray-100 dark:border-gray-800">
                <div className="relative w-20 h-20 mx-auto mb-6">
                   <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 rounded-3xl rotate-12 animate-pulse" />
                   <FaRocket className="absolute inset-0 m-auto text-blue-500 text-3xl" />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                  {isFiltered ? '검색된 결과가 없네요' : '아직 앱이 없어요'}
                </h3>
                <p className="text-sm font-bold text-gray-400 mb-8 max-w-xs mx-auto">
                  {isFiltered ? '키워드나 필터를 변경해서 다시 시도해보세요!' : 'AI LABS의 첫 번째 주인공이 되어보세요'}
                </p>
                {isFiltered && (
                  <button
                    onClick={clearAllFilters}
                    className="px-8 py-3 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-black hover:scale-105 transition-all shadow-xl"
                  >
                    필터 전체 초기화
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6 animate-fadeIn">
                {paginatedApps.map((app) => (
                  <AppCard 
                    key={app.id} 
                    app={app} 
                    categoryInfo={getCategoryInfo(app.category, categories)} 
                  />
                ))}
              </div>
            )}

            {/* Pagination with modern look */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-16">
                <button
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-gray-50 transition-all font-bold shadow-sm"
                >
                  ←
                </button>
                
                <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page;
                  if (totalPages <= 5) page = i + 1;
                  else if (currentPage <= 3) page = i + 1;
                  else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                  else page = currentPage - 2 + i;
                  
                  return (
                    <button
                      key={page}
                      onClick={() => onPageChange(page)}
                      className={`w-9 h-9 rounded-xl text-sm font-black transition-all ${
                        page === currentPage
                          ? 'bg-blue-600 text-white shadow-lg scale-110'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                </div>

                <button
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-gray-50 transition-all font-bold shadow-sm"
                >
                  →
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Floating Action Button for Register in Mobile */}
      <div className="sm:hidden fixed bottom-6 right-6 z-50">
         <Link
            href="/apps/new"
            className="w-14 h-14 rounded-full bg-blue-600 text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
         >
            <FaPlus className="text-xl" />
         </Link>
      </div>

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 sm:bottom-8 right-6 sm:right-8 w-11 h-11 rounded-2xl bg-gray-950 dark:bg-white text-white dark:text-gray-950 shadow-2xl flex items-center justify-center hover:scale-110 hover:-translate-y-1 transition-all z-50 animate-fadeIn"
        >
          <FaArrowUp className="text-sm" />
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
