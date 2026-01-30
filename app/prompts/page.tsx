'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { getAllPrompts, getPromptsByCategory } from '@/lib/db';
import { Prompt } from '@/types/prompt';
import { getPromptCategoryInfo } from '@/lib/promptCategories';
import { usePromptCategories } from '@/lib/useCategories';
import PromptCard from '@/components/PromptCard';
import Link from 'next/link';
import { FaFeatherAlt, FaFilter, FaList, FaPlus, FaSearch, FaThLarge, FaUser, FaHome, FaArrowUp, FaRocket } from 'react-icons/fa';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useOneTimeAccess } from '@/contexts/OneTimeAccessContext';

export default function PromptsPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-col justify-center items-center py-20 md:py-32">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-emerald-500"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">프롬프트를 불러오는 중...</p>
      </div>
    }>
      <PromptsListContent />
    </Suspense>
  );
}

function PromptsListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);

  // Read from URL params as source of truth
  const selectedCategory = (searchParams.get('category') as Prompt['category'] | 'all') || 'all';
  const currentPage = Number(searchParams.get('page')) || 1;
  const viewMode = (searchParams.get('view') as 'card' | 'list') || 'card';
  const searchTerm = searchParams.get('search') || '';
  const selectedTag = searchParams.get('tag') || null;

  const [showScrollTop, setShowScrollTop] = useState(false);
  const itemsPerPage = viewMode === 'card' ? 12 : 10;
  const { categories: promptCategories, loading: loadingCategories } = usePromptCategories();
  const { user } = useAuth();
  const { isActive: hasOneTimeAccess } = useOneTimeAccess();
  const listTopRef = useRef<HTMLDivElement | null>(null);
  const listControlsRef = useRef<HTMLDivElement | null>(null);

  const loadPrompts = useCallback(async (isMounted: { current: boolean }) => {
    if (!isMounted.current) return;
    setLoading(true);
    console.log('[PromptsPage] Loading prompts started...', { category: selectedCategory });
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('프롬프트 목록 로딩 시간 초과')), 7000)
      );

      const fetchPromise = selectedCategory === 'all'
        ? getAllPrompts()
        : getPromptsByCategory(selectedCategory);

      const data = await Promise.race([fetchPromise, timeoutPromise]) as Prompt[];

      if (isMounted.current) {
        setPrompts(data || []);
        console.log(`[PromptsPage] Loading finished. ${data?.length || 0} prompts found.`);
      }
    } catch (error) {
      if (isMounted.current) {
        console.error('[PromptsPage] Error loading prompts:', error);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [selectedCategory]);

  useEffect(() => {
    const mounted = { current: true };
    loadPrompts(mounted);
    return () => {
      mounted.current = false;
    };
  }, [loadPrompts]);

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

  const onCategoryChange = (category: Prompt['category'] | 'all') => {
    updateParams({ category, page: '1' });
  };

  const onPageChange = (page: number) => {
    updateParams({ page: Math.max(1, page).toString() });
  };

  const onSearchChange = (term: string) => {
    updateParams({ search: term || null, page: '1' });
  };

  const onViewModeChange = (view: 'card' | 'list') => {
    updateParams({ view, page: '1' });
  };

  const onTagChange = (tag: string | null) => {
    updateParams({ tag: tag || null, page: '1' });
  };

  useEffect(() => {
    if (loadingCategories) return;
    if (selectedCategory === 'all') return;
    if (promptCategories.length === 0) return;
    if (!promptCategories.find((cat) => cat.value === selectedCategory)) {
      onCategoryChange('all');
    }
  }, [promptCategories, selectedCategory, loadingCategories]);

  useEffect(() => {
    const updateVisibility = () => {
      const node = listControlsRef.current;
      if (!node) {
        setShowScrollTop(false);
        return;
      }
      const rect = node.getBoundingClientRect();
      const controlsBottom = rect.bottom + window.scrollY;
      setShowScrollTop(window.scrollY > controlsBottom + 12);
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
    return prompts.filter((prompt) => (prompt.isPublic ?? true) || prompt.createdBy === uid);
  }, [prompts, user?.id, hasOneTimeAccess]);

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    visiblePrompts.forEach(prompt => {
      if (prompt.tags) {
        prompt.tags.forEach(tag => tagsSet.add(tag));
      }
    });
    return Array.from(tagsSet).sort();
  }, [visiblePrompts]);

  const filteredPrompts = useMemo(() => {
    let result = visiblePrompts;

    if (selectedTag) {
      result = result.filter(p => p.tags?.includes(selectedTag));
    }

    const term = searchTerm.trim().toLowerCase();
    if (!term) return result;

    return result.filter((prompt) => {
      const name = prompt.name.toLowerCase();
      const author = prompt.createdByName.toLowerCase();
      const desc = prompt.description.toLowerCase();
      const tags = (prompt.tags || []).join(' ').toLowerCase();
      return name.includes(term) || author.includes(term) || desc.includes(term) || tags.includes(term);
    });
  }, [visiblePrompts, searchTerm, selectedTag]);

  const totalPages = Math.ceil(filteredPrompts.length / itemsPerPage);
  const paginatedPrompts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPrompts.slice(start, start + itemsPerPage);
  }, [filteredPrompts, currentPage, itemsPerPage]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      onPageChange(totalPages);
    }
  }, [totalPages, currentPage]);

  useLayoutEffect(() => {
    const node = listTopRef.current;
    if (!node) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }
    const scrollToTop = () => {
      const targetTop = node.getBoundingClientRect().top + window.scrollY - 24;
      window.scrollTo({ top: Math.max(0, targetTop), behavior: 'auto' });
    };
    scrollToTop();
    const timeoutId = window.setTimeout(scrollToTop, 80);
    return () => window.clearTimeout(timeoutId);
  }, [currentPage]);

  const badgeTone = (category: Prompt['category']) => {
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
      case 'image':
        return 'from-cyan-400 via-sky-500 to-blue-600';
      default:
        return 'from-slate-200 via-slate-300 to-slate-400 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900';
    }
  };

  const scrollToListTop = () => {
    const node = listTopRef.current;
    if (!node) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const targetTop = node.getBoundingClientRect().top + window.scrollY - 24;
    window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
  };

  return (
    <>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="md:flex md:items-start md:gap-10 lg:gap-14">
          <aside className="hidden md:block sticky top-24 space-y-4 self-start md:w-[22%] lg:w-[20%]">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
              <FaFilter className="text-gray-500 dark:text-gray-400" />
              <h2 className="text-lg font-semibold">카테고리</h2>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => onCategoryChange('all')}
                className={`w-full text-left px-4 py-2.5 rounded-xl border font-medium transition ${selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white border-transparent shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
              >
                전체
              </button>
              {promptCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.value}
                    onClick={() => onCategoryChange(category.value)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl border font-medium transition flex items-center gap-2 ${selectedCategory === category.value
                      ? `${category.color} text-white border-transparent shadow-md`
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                  >
                    <Icon className="text-sm" />
                    <span>{category.label}</span>
                  </button>
                );
              })}
            </div>

            {allTags.length > 0 && (
              <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200 mb-4">
                  <FaRocket className="text-gray-500 dark:text-gray-400 rotate-45" />
                  <h2 className="text-lg font-semibold">인기 태그</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onTagChange(null)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${!selectedTag
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                  >
                    전체 태그
                  </button>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => onTagChange(tag)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${selectedTag === tag
                        ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-500/20'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <section className="min-w-0 md:w-[78%] lg:w-[80%] space-y-10">
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <Link href="/" className="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200">
                <FaHome className="text-base" />
                <span>홈</span>
              </Link>
              <span className="text-gray-400 dark:text-gray-500">/</span>
              <span className="font-medium text-gray-600 dark:text-gray-300">프롬프트</span>
            </div>

            {/* 히어로 */}
            <div className="text-left mb-4 md:mb-2 animate-fadeIn">
              <div className="inline-flex items-center space-x-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-4 py-2 rounded-full mb-6 text-sm font-medium">
                <FaFeatherAlt />
                <span>프롬프트, 아이디어를 더 깊게</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 text-gray-900 dark:text-gray-50">
                <span className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 bg-clip-text text-transparent">
                  프롬프트 아카이브
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
                실전에서 검증한 프롬프트와 상세한 활용 팁, SNS 소개 링크까지 한 곳에서 살펴보세요.
              </p>

              <div className="mt-8 flex flex-wrap justify-start gap-4 sm:gap-6">
                <div className="bg-white dark:bg-gray-800 px-6 py-3 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                  <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">
                    {prompts.length}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">등록된 프롬프트</div>
                </div>
                <div className="bg-white dark:bg-gray-800 px-6 py-3 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                  <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                    {promptCategories.length}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">카테고리</div>
                </div>
                <Link
                  href="/prompts/new"
                  className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 border border-gray-900 dark:border-white font-semibold shadow-sm hover:-translate-y-0.5 transition-all"
                >
                  <FaPlus />
                  <span>프롬프트 등록</span>
                </Link>
              </div>
            </div>

            {/* 카테고리 필터 - 모바일 */}
            <div className="block md:hidden">
              <div className="flex items-center gap-2 mb-3">
                <FaFilter className="text-gray-600 dark:text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">카테고리</h2>
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-3">
                <button
                  onClick={() => onCategoryChange('all')}
                  className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full transition-all transform hover:scale-105 font-medium shadow-md ${selectedCategory === 'all'
                    ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                    }`}
                >
                  전체
                </button>
                {promptCategories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.value}
                      onClick={() => onCategoryChange(category.value)}
                      className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full transition-all transform hover:scale-105 flex items-center space-x-2 font-medium shadow-md ${selectedCategory === category.value
                        ? `${category.color} text-white shadow-lg`
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                        }`}
                    >
                      <Icon className="text-sm" />
                      <span className="text-sm sm:text-base">{category.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div ref={listTopRef} />
            {/* 목록 */}
            {loading ? (
              <div className="flex flex-col justify-center items-center py-20 md:py-32">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-emerald-500"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-200 dark:border-emerald-900"></div>
                </div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">프롬프트를 불러오는 중...</p>
              </div>
            ) : prompts.length === 0 ? (
              <div className="text-center py-20 md:py-32 animate-fadeIn">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FaFeatherAlt className="text-white text-3xl" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                  등록된 프롬프트가 없습니다
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  첫 번째 프롬프트를 공유해 주세요.
                </p>
              </div>
            ) : (
              <div className="animate-fadeIn space-y-7 md:space-y-8 border-t border-gray-200 dark:border-gray-800 pt-10 md:pt-12 mt-6 md:mt-8">
                <div ref={listControlsRef} className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{filteredPrompts.length}개</span>의 프롬프트를 찾았습니다
                    </p>
                    <div className="relative">
                      <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="제목 또는 작성자로 검색"
                        className="w-full sm:w-64 lg:w-72 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 pl-9 pr-4 py-2 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        aria-label="프롬프트 검색"
                      />
                    </div>
                  </div>
                  <div className="inline-flex rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                    <button
                      onClick={() => onViewModeChange('card')}
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
                      onClick={() => onViewModeChange('list')}
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

                {filteredPrompts.length === 0 ? (
                  <div className="text-center py-16 sm:py-20">
                    <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">검색 결과가 없습니다</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">다른 키워드나 카테고리를 시도해 주세요.</p>
                  </div>
                ) : viewMode === 'card' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 items-stretch">
                    {paginatedPrompts.map((prompt, index) => (
                      <div
                        key={prompt.id}
                        style={{
                          animationDelay: `${index * 0.05}s`
                        }}
                        className="animate-fadeIn h-full"
                      >
                        <PromptCard prompt={prompt} categoryInfo={getPromptCategoryInfo(prompt.category, promptCategories)} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {paginatedPrompts.map((prompt, index) => {
                      const categoryInfo = getPromptCategoryInfo(prompt.category, promptCategories);
                      const CategoryIcon = categoryInfo.icon;
                      return (
                        <Link
                          key={prompt.id}
                          href={`/prompts/${prompt.id}`}
                          style={{
                            animationDelay: `${index * 0.05}s`
                          }}
                          className="group flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 sm:px-5 py-3 sm:py-4 shadow-sm hover:shadow-md transition hover:-translate-y-0.5 animate-fadeIn"
                        >
                          <div
                            className={`h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center rounded-xl bg-gradient-to-br ${badgeTone(
                              prompt.category
                            )} text-white shadow-inner`}
                          >
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
                {filteredPrompts.length > 0 && totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => onPageChange(currentPage - 1)}
                      className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                      disabled={currentPage === 1}
                    >
                      이전
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-200">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => onPageChange(currentPage + 1)}
                      className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                      disabled={currentPage === totalPages}
                    >
                      다음
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToListTop}
          className="fixed bottom-6 right-5 z-50 flex items-center gap-2 rounded-full bg-gray-900 text-white px-4 py-2 text-sm font-semibold shadow-lg transition hover:-translate-y-0.5 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
          aria-label="맨 위로 이동"
        >
          <FaArrowUp />
          <span>맨 위로</span>
        </button>
      )}
      <Footer />
    </>
  );
}
