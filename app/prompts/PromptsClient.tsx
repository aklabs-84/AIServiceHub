'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { Prompt } from '@/types/database';
import { getPromptCategoryInfo } from '@/lib/promptCategories';
import { usePromptCategories } from '@/lib/useCategories';
import PromptCard from '@/components/PromptCard';
import Image from 'next/image';
import Link from 'next/link';
import { FaArrowUp, FaFire, FaPlus, FaRegClock, FaRocket, FaSearch, FaTimes, FaFeatherAlt, FaHeart, FaLock } from 'react-icons/fa';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useOneTimeAccess } from '@/contexts/OneTimeAccessContext';

type PromptsClientProps = {
  initialPrompts: Prompt[];
};

// Popular/Latest 섹션용 경량 리스트 아이템
function PromptListRow({ prompt, rank, categoryLabel }: {
  prompt: Prompt;
  rank?: number;
  categoryLabel: string;
}) {
  const [imgError, setImgError] = useState(false);
  const isPaid = prompt.isPaid && prompt.price > 0;

  return (
    <Link
      href={`/prompts/${prompt.id}`}
      className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-all duration-300 active:scale-[0.98]"
    >
      {rank !== undefined && (
        <div className="flex-none w-6 text-center">
          <span className={`text-lg font-black tracking-tighter ${rank <= 3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-300 dark:text-gray-700'}`}>
            {rank}
          </span>
        </div>
      )}
      <div className="flex-none relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shadow-sm">
        {prompt.thumbnailUrl && !imgError ? (
          <Image
            src={prompt.thumbnailUrl}
            alt={prompt.name}
            fill
            sizes="80px"
            className="object-cover group-hover:scale-110 transition-transform duration-700"
            style={{ objectPosition: `${prompt.thumbnailPositionX ?? 50}% ${prompt.thumbnailPositionY ?? 50}%` }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-500">
            <FaFeatherAlt className="text-white text-2xl" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
        <h3 className="text-sm sm:text-base font-black text-gray-950 dark:text-white truncate leading-tight group-hover:text-emerald-600 transition-colors">
          {prompt.name}
        </h3>
        <div className="flex items-center gap-2">
          <p className="text-[11px] sm:text-xs font-bold text-gray-400 uppercase tracking-wide truncate">
            {categoryLabel}
          </p>
          <span className="w-1 h-1 rounded-full bg-gray-200 dark:bg-gray-800 flex-none" />
          <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-gray-400">
            <FaHeart className="text-[9px]" />
            <span>{prompt.likeCount ?? prompt.likes.length}</span>
          </div>
          {isPaid && (
            <>
              <span className="w-1 h-1 rounded-full bg-gray-200 dark:bg-gray-800 flex-none" />
              <span className="flex items-center gap-0.5 text-[11px] font-black text-amber-500">
                <FaLock className="text-[8px]" />{prompt.price.toLocaleString()}원
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex-none opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
        <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-[10px] font-black shadow-lg shadow-emerald-600/20">
          OPEN
        </span>
      </div>
    </Link>
  );
}

export default function PromptsClient({ initialPrompts }: PromptsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [prompts, setPrompts] = useState<Prompt[]>(initialPrompts);
  const selectedCategory = (searchParams.get('category') as Prompt['category'] | 'all') || 'all';
  const currentPage = Number(searchParams.get('page')) || 1;
  const searchTerm = searchParams.get('search') || '';
  const selectedTag = searchParams.get('tag') || null;
  const selectedPricing = (searchParams.get('pricing') as 'all' | 'free' | 'paid') || 'all';

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [searchInput, setSearchInput] = useState(searchTerm);
  const composingRef = useRef(false);
  const searchDebounceRef = useRef<number | null>(null);
  const { categories: promptCategories, loading: loadingCategories } = usePromptCategories();
  const itemsPerPage = 9;
  const { user } = useAuth();
  const { isActive: hasOneTimeAccess } = useOneTimeAccess();
  const listTopRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const isFirstMount = useRef(true);

  useEffect(() => { setPrompts(initialPrompts); }, [initialPrompts]);
  useEffect(() => { setSearchInput(searchTerm); }, [searchTerm]);
  useEffect(() => {
    return () => { if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current); };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const queryString = searchParams.toString();
      const currentFullUrl = queryString ? `${pathname}?${queryString}` : pathname;
      sessionStorage.setItem('lastPromptsListUrl', currentFullUrl);
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

  const onCategoryChange = (category: Prompt['category'] | 'all') => updateParams({ category, page: '1' });
  const onPageChange = (page: number) => updateParams({ page: Math.max(1, page).toString() });
  const commitSearch = useCallback((term: string) => {
    updateParams({ search: term || null, page: '1' });
  }, [updateParams]);
  const onTagChange = (tag: string | null) => updateParams({ tag: tag || null, page: '1' });
  const onPricingChange = (pricing: 'all' | 'free' | 'paid') => {
    updateParams({ pricing: pricing === 'all' ? null : pricing, page: '1' });
  };

  useEffect(() => {
    if (loadingCategories || selectedCategory === 'all' || promptCategories.length === 0) return;
    if (!promptCategories.find((cat) => cat.value === selectedCategory)) onCategoryChange('all');
  }, [promptCategories, selectedCategory, loadingCategories]);

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

  const visiblePrompts = useMemo(() => {
    if (hasOneTimeAccess) return prompts;
    const uid = user?.id;
    return prompts.filter((p) => (p.isPublic ?? true) || p.createdBy === uid);
  }, [prompts, user?.id, hasOneTimeAccess]);

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    visiblePrompts.forEach(p => { if (p.tags) p.tags.forEach(t => tagsSet.add(t)); });
    return Array.from(tagsSet).sort();
  }, [visiblePrompts]);

  const filteredPrompts = useMemo(() => {
    let result = visiblePrompts;
    if (selectedCategory !== 'all') result = result.filter(p => p.category === selectedCategory);
    if (selectedTag) result = result.filter(p => p.tags?.includes(selectedTag));
    if (selectedPricing === 'free') result = result.filter(p => !p.isPaid || p.price === 0);
    if (selectedPricing === 'paid') result = result.filter(p => p.isPaid && p.price > 0);
    const term = searchInput.trim().toLowerCase();
    if (!term) return result;
    return result.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.createdByName.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term) ||
      (p.tags || []).join(' ').toLowerCase().includes(term)
    );
  }, [visiblePrompts, selectedCategory, searchInput, selectedTag, selectedPricing]);

  const isFiltered = selectedCategory !== 'all' || !!searchTerm || !!selectedTag || selectedPricing !== 'all';

  const popularPrompts = useMemo(() =>
    [...visiblePrompts].sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0)).slice(0, 5),
    [visiblePrompts]
  );
  const latestPrompts = useMemo(() =>
    [...visiblePrompts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    [visiblePrompts]
  );

  const totalPages = Math.ceil(filteredPrompts.length / itemsPerPage);
  const paginatedPrompts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPrompts.slice(start, start + itemsPerPage);
  }, [filteredPrompts, currentPage, itemsPerPage]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) onPageChange(totalPages);
  }, [totalPages, currentPage]);

  useLayoutEffect(() => {
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
    updateParams({ category: null, search: null, tag: null, pricing: null, page: '1' });
    setSearchInput('');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      {!isFiltered && (
        <section className="relative bg-white dark:bg-gray-950 pb-6 sm:pb-10 overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-8 sm:p-12 shadow-2xl">
              <div className="absolute top-[-20%] right-[-10%] w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-[-20%] right-[20%] w-64 h-64 bg-teal-400/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute top-[10%] left-[5%] w-32 h-32 bg-emerald-300/10 rounded-full blur-xl pointer-events-none" />
              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-8">
                <div className="max-w-xl text-center sm:text-left">
                  <p className="text-emerald-100 text-xs sm:text-sm font-black uppercase tracking-widest mb-3 opacity-90">
                    바이브코딩 · AI LABS PROMPT ARCHIVE
                  </p>
                  <h1 className="text-white text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.1] mb-4 tracking-tighter">
                    검증된 프롬프트가 <br className="hidden sm:block" />모이는 곳
                  </h1>
                  <p className="text-white/80 text-sm sm:text-base leading-relaxed mb-6 font-medium">
                    실전에서 검증된 프롬프트와 활용 팁을 한 곳에서 살펴보세요.<br className="hidden sm:block" />
                    나만의 프롬프트를 등록하고 공유할 수 있습니다.
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                    <Link
                      href="/prompts/new"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-emerald-700 text-sm sm:text-base font-black hover:bg-emerald-50 transition-all shadow-xl hover:scale-105 active:scale-95"
                    >
                      <FaPlus className="text-xs" />
                      프롬프트 등록하기
                    </Link>
                    <div className="hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-bold">
                      <FaFeatherAlt className="text-emerald-300" />
                      <span>{visiblePrompts.length}개의 프롬프트</span>
                    </div>
                  </div>
                </div>
                <div className="hidden lg:block relative">
                  <div className="w-48 h-48 rounded-[40px] bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center p-8">
                    <FaFeatherAlt className="text-white text-7xl opacity-80" />
                  </div>
                  <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-3xl bg-emerald-500 shadow-xl flex items-center justify-center text-white text-3xl animate-bounce-slow">
                    <FaFire />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Sticky Nav ─────────────────────────────────────────────────── */}
      <div
        ref={headerRef}
        className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 transition-all duration-300 shadow-sm"
      >
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 sm:py-4">
            <div className="flex items-center flex-1 gap-4 overflow-hidden">
              {/* 검색 */}
              <div className="relative flex-none w-full sm:w-64 lg:w-80 group">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs transition-colors group-focus-within:text-emerald-500" />
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
                  placeholder="프롬프트 이름, 설명 검색..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 transition-all font-medium"
                />
              </div>

              {/* 카테고리 칩 (가로 스크롤) */}
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
                {promptCategories.map((category) => {
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

            {/* 등록 버튼 */}
            <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-gray-100 dark:border-gray-800">
              <Link
                href="/prompts/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 dark:bg-emerald-600 text-white text-xs font-black hover:bg-black dark:hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
              >
                <FaPlus className="text-[10px]" />
                <span>등록</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Active Filters ─────────────────────────────────────────────── */}
      {isFiltered && (
        <div className="bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800">
          <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center flex-wrap gap-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">ACTIVE FILTERS:</span>
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-black shadow-sm">
                {getPromptCategoryInfo(selectedCategory as Prompt['category'], promptCategories).label}
                <button onClick={() => onCategoryChange('all')} className="hover:text-emerald-900 bg-white/20 rounded-full p-0.5">
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
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-[11px] font-black">
                #{selectedTag}
                <button onClick={() => onTagChange(null)} className="hover:text-teal-900 bg-white/20 rounded-full p-0.5">
                  <FaTimes className="text-[8px]" />
                </button>
              </span>
            )}
            {selectedPricing !== 'all' && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black ${
                selectedPricing === 'paid'
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                  : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
              }`}>
                {selectedPricing === 'paid' ? '💎 유료' : '🆓 무료'}
                <button onClick={() => onPricingChange('all')} className="hover:opacity-70 bg-white/20 rounded-full p-0.5">
                  <FaTimes className="text-[8px]" />
                </button>
              </span>
            )}
            <button onClick={clearAllFilters} className="ml-auto text-[11px] font-black text-emerald-600 hover:text-emerald-800 transition-colors">
              RESET ALL
            </button>
          </div>
        </div>
      )}

      <main>
        {/* ── Popular & Latest ───────────────────────────────────────────── */}
        {!isFiltered && visiblePrompts.length > 0 && (
          <section className="bg-gray-50/80 dark:bg-gray-900/50 py-12 sm:py-16 border-y border-gray-100 dark:border-gray-800">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-x-16">
                {/* Popular */}
                <div className="space-y-6 sm:space-y-8">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <FaFire className="text-orange-600 dark:text-orange-400 text-sm" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white tracking-tighter uppercase">Popular</h2>
                    </div>
                    <span className="text-[10px] font-black text-gray-400 tracking-widest bg-white dark:bg-gray-800 px-2 py-1 rounded-md shadow-sm">TOP 5</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {popularPrompts.map((p, idx) => (
                      <PromptListRow
                        key={p.id}
                        prompt={p}
                        rank={idx + 1}
                        categoryLabel={getPromptCategoryInfo(p.category, promptCategories).label}
                      />
                    ))}
                  </div>
                </div>

                {/* Latest */}
                <div className="space-y-6 sm:space-y-8 mt-12 lg:mt-0">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                        <FaRegClock className="text-teal-600 dark:text-teal-400 text-sm" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white tracking-tighter uppercase">New Arrivals</h2>
                    </div>
                    <span className="text-[10px] font-black text-gray-400 tracking-widest bg-white dark:bg-gray-800 px-2 py-1 rounded-md shadow-sm">LATEST 5</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {latestPrompts.map((p) => (
                      <PromptListRow
                        key={p.id}
                        prompt={p}
                        categoryLabel={getPromptCategoryInfo(p.category, promptCategories).label}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Explorer ───────────────────────────────────────────────────── */}
        <section className="bg-white dark:bg-gray-950 py-12 sm:py-16">
          <div className="container mx-auto px-4 sm:px-6">
            <div ref={listTopRef} />

            <div className="mb-10">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
                <div className="flex flex-col gap-1.5">
                  <h2 className="text-2xl sm:text-3xl font-black text-gray-950 dark:text-white tracking-tighter">
                    {isFiltered ? '검색 결과' : '프롬프트 탐색'}
                    <span className="ml-3 text-sm sm:text-lg font-black text-emerald-500 opacity-60">
                      ({filteredPrompts.length})
                    </span>
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-8 h-1 bg-emerald-500 rounded-full" />
                    <p className="text-xs sm:text-sm font-bold text-gray-400">태그와 카테고리로 원하는 프롬프트를 찾아보세요</p>
                  </div>
                </div>
              </div>

              {/* 무료/유료 필터 */}
              <div className="flex items-center gap-2 mb-3">
                {([
                  { value: 'all', label: '전체', emoji: '🔍' },
                  { value: 'free', label: '무료', emoji: '🆓' },
                  { value: 'paid', label: '유료', emoji: '💎' },
                ] as const).map(({ value, label, emoji }) => {
                  const count = value === 'all'
                    ? visiblePrompts.length
                    : value === 'free'
                      ? visiblePrompts.filter(p => !p.isPaid || p.price === 0).length
                      : visiblePrompts.filter(p => p.isPaid && p.price > 0).length;
                  return (
                    <button
                      key={value}
                      onClick={() => onPricingChange(value)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] sm:text-xs font-black transition-all border ${
                        selectedPricing === value
                          ? value === 'paid'
                            ? 'bg-amber-500 text-white border-transparent shadow-md'
                            : value === 'free'
                              ? 'bg-emerald-500 text-white border-transparent shadow-md'
                              : 'bg-emerald-600 text-white border-transparent shadow-md'
                          : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-700 hover:border-emerald-300 hover:text-emerald-600'
                      }`}
                    >
                      <span>{emoji}</span>
                      <span>{label}</span>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${selectedPricing === value ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 태그 칩 */}
              {allTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 p-4 rounded-3xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
                  <span className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mr-2 px-1">TAGS:</span>
                  {allTags.slice(0, 20).map(tag => (
                    <button
                      key={tag}
                      onClick={() => onTagChange(selectedTag === tag ? null : tag)}
                      className={`px-4 py-2 rounded-xl text-[11px] sm:text-xs font-black transition-all border ${
                        selectedTag === tag
                          ? 'bg-emerald-600 text-white border-transparent shadow-md scale-105'
                          : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 hover:text-emerald-600'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 그리드 */}
            {paginatedPrompts.length === 0 ? (
              <div className="text-center py-32 rounded-[40px] border-2 border-dashed border-gray-100 dark:border-gray-800">
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 bg-emerald-100 dark:bg-emerald-900/30 rounded-3xl rotate-12 animate-pulse" />
                  <FaFeatherAlt className="absolute inset-0 m-auto text-emerald-500 text-3xl" />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                  {isFiltered ? '검색된 결과가 없네요' : '아직 프롬프트가 없어요'}
                </h3>
                <p className="text-sm font-bold text-gray-400 mb-8 max-w-xs mx-auto">
                  {isFiltered ? '키워드나 필터를 변경해서 다시 시도해보세요!' : '첫 번째 프롬프트를 등록해보세요'}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
                {paginatedPrompts.map((prompt) => (
                  <PromptCard
                    key={prompt.id}
                    prompt={prompt}
                    categoryInfo={getPromptCategoryInfo(prompt.category, promptCategories)}
                  />
                ))}
              </div>
            )}

            {/* 페이지네이션 */}
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
                            ? 'bg-emerald-600 text-white shadow-lg scale-110'
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

      {/* 모바일 FAB */}
      <div className="sm:hidden fixed bottom-6 right-6 z-50">
        <Link
          href="/prompts/new"
          className="w-14 h-14 rounded-full bg-emerald-600 text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
        >
          <FaPlus className="text-xl" />
        </Link>
      </div>

      {/* 스크롤 상단 */}
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
