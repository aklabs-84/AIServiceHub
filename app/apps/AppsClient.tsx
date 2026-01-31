'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { AIApp, AppCategory } from '@/types/app';
import AppCard from '@/components/AppCard';
import { getCategoryInfo } from '@/lib/categories';
import { useAppCategories } from '@/lib/useCategories';
import { FaFilter, FaHome, FaList, FaPlus, FaRocket, FaSearch, FaThLarge, FaUser, FaArrowUp } from 'react-icons/fa';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useOneTimeAccess } from '@/contexts/OneTimeAccessContext';

type AppsClientProps = {
  initialApps: AIApp[];
};

export default function AppsClient({ initialApps }: AppsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [apps, setApps] = useState<AIApp[]>(initialApps);

  // Read from URL params as source of truth
  const selectedCategory = (searchParams.get('category') as AppCategory | 'all') || 'all';
  const currentPage = Number(searchParams.get('page')) || 1;
  const viewMode = (searchParams.get('view') as 'card' | 'list') || 'card';
  const searchTerm = searchParams.get('search') || '';
  const selectedTag = searchParams.get('tag') || null;

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [searchInput, setSearchInput] = useState(searchTerm);
  const composingRef = useRef(false);
  const searchDebounceRef = useRef<number | null>(null);
  const { categories, loading: loadingCategories } = useAppCategories();
  const itemsPerPage = viewMode === 'card' ? 12 : 10;
  const { user } = useAuth();
  const { isActive: hasOneTimeAccess } = useOneTimeAccess();
  const listTopRef = useRef<HTMLDivElement | null>(null);
  const listControlsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setApps(initialApps);
  }, [initialApps]);

  useEffect(() => {
    setSearchInput(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  // refresh handled by server-rendered data on navigation

  // showError/showInfo reserved for future inline feedback

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

  const onViewModeChange = (view: 'card' | 'list') => {
    updateParams({ view, page: '1' });
  };

  const onTagChange = (tag: string | null) => {
    updateParams({ tag: tag || null, page: '1' });
  };

  useEffect(() => {
    if (loadingCategories) return; // 카테고리 로딩 중에는 체크하지 않음
    if (selectedCategory === 'all') return;
    if (categories.length === 0) return;
    if (!categories.find((cat) => cat.value === selectedCategory)) {
      onCategoryChange('all');
    }
  }, [categories, selectedCategory, loadingCategories]);

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

  const visibleApps = useMemo(() => {
    if (hasOneTimeAccess) return apps;
    const uid = user?.id;
    return apps.filter((app) => (app.isPublic ?? true) || app.createdBy === uid);
  }, [apps, user?.id, hasOneTimeAccess]);

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    visibleApps.forEach(app => {
      if (app.tags) {
        app.tags.forEach(tag => tagsSet.add(tag));
      }
    });
    return Array.from(tagsSet).sort();
  }, [visibleApps]);

  const filteredApps = useMemo(() => {
    let result = visibleApps;

    if (selectedCategory !== 'all') {
      result = result.filter(app => app.category === selectedCategory);
    }

    if (selectedTag) {
      result = result.filter(app => app.tags?.includes(selectedTag));
    }

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

  const totalPages = Math.ceil(filteredApps.length / itemsPerPage);
  const paginatedApps = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredApps.slice(start, start + itemsPerPage);
  }, [filteredApps, currentPage, itemsPerPage]);

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

  const badgeTone = (category: AppCategory) => {
    switch (category) {
      case 'chatbot':
        return 'from-blue-300 via-blue-400 to-blue-500';
      case 'content-generation':
        return 'from-purple-300 via-purple-400 to-purple-500';
      case 'data-analysis':
        return 'from-emerald-300 via-emerald-400 to-emerald-500';
      case 'image-generation':
        return 'from-pink-300 via-pink-400 to-pink-500';
      case 'code-assistant':
        return 'from-amber-300 via-amber-400 to-amber-500';
      case 'translation':
        return 'from-indigo-300 via-indigo-400 to-indigo-500';
      case 'education':
        return 'from-red-300 via-red-400 to-red-500';
      case 'game':
        return 'from-orange-300 via-orange-400 to-orange-500';
      case 'productivity':
        return 'from-teal-300 via-teal-400 to-teal-500';
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/" className="inline-flex items-center gap-1 hover:text-gray-800 dark:hover:text-gray-200">
            <FaHome /> 홈
          </Link>
          <span className="text-gray-300 dark:text-gray-700">/</span>
          <span>바이브코딩</span>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">AI 앱 모음</p>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">바이브코딩 아카이브</h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                  생산성/이미지/번역/코딩 등 다양한 AI 앱을 빠르게 탐색해보세요.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/apps/new"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 border border-gray-900 dark:border-white font-semibold shadow-sm hover:-translate-y-0.5 transition"
                >
                  <FaPlus /> 앱 등록
                </Link>
                <Link
                  href="/my"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <FaUser /> 마이페이지
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold">
                <FaRocket />
                등록 앱 <span className="text-blue-600 dark:text-blue-400">{visibleApps.length}</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold">
                카테고리 <span className="text-emerald-600 dark:text-emerald-400">{categories.length || 0}</span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">STEP 1</p>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">탐색</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">카테고리/태그/검색으로 원하는 앱을 찾으세요.</p>
              </div>
              <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">STEP 2</p>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">저장</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">내가 만든 앱을 등록하고 공유하세요.</p>
              </div>
              <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">STEP 3</p>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">피드백</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">좋아요와 댓글로 의견을 나눠보세요.</p>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <FaFilter />
                <span>카테고리 필터</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1">
                  <FaFilter className="text-[10px]" /> 태그
                </span>
                {allTags.length === 0 ? (
                  <span>등록된 태그가 없습니다</span>
                ) : (
                  <>
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => onTagChange(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${selectedTag === tag
                          ? 'bg-blue-600 text-white border-transparent'
                          : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                      >
                        #{tag}
                      </button>
                    ))}
                    {selectedTag && (
                      <button
                        onClick={() => onTagChange(null)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        태그 초기화
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* 카테고리 필터 - 데스크탑 */}
            <div className="hidden md:block mb-8">
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <button
                  onClick={() => onCategoryChange('all')}
                  className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full transition-all transform hover:scale-105 font-medium shadow-md ${selectedCategory === 'all'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                    }`}
                >
                  전체
                </button>
                {categories.map((category) => {
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
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                    }`}
                >
                  전체
                </button>
                {categories.map((category) => {
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
            {/* 앱 목록 */}
            {visibleApps.length === 0 ? (
              <div className="text-center py-20 md:py-32 animate-fadeIn">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FaRocket className="text-white text-3xl" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                  등록된 앱이 없습니다
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  첫 번째 앱을 등록해보세요!
                </p>
              </div>
            ) : (
              <div className="animate-fadeIn space-y-7 md:space-y-8 border-t border-gray-200 dark:border-gray-800 pt-10 md:pt-12 mt-6 md:mt-8">
                <div ref={listControlsRef} className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{filteredApps.length}개</span>의 앱을 찾았습니다
                    </p>
                    <div className="relative">
                      <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={searchInput}
                        onChange={(e) => {
                          const next = e.target.value;
                          setSearchInput(next);
                          if (composingRef.current) return;
                          if (searchDebounceRef.current) {
                            window.clearTimeout(searchDebounceRef.current);
                          }
                          searchDebounceRef.current = window.setTimeout(() => {
                            commitSearch(next);
                          }, 250);
                        }}
                        onCompositionStart={() => {
                          composingRef.current = true;
                        }}
                        onCompositionEnd={(e) => {
                          composingRef.current = false;
                          const next = e.currentTarget.value;
                          setSearchInput(next);
                          if (searchDebounceRef.current) {
                            window.clearTimeout(searchDebounceRef.current);
                          }
                          commitSearch(next);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (searchDebounceRef.current) {
                              window.clearTimeout(searchDebounceRef.current);
                            }
                            commitSearch(searchInput);
                          }
                        }}
                        placeholder="제목 또는 작성자로 검색"
                        className="w-full sm:w-64 lg:w-72 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 pl-9 pr-4 py-2 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        aria-label="앱 검색"
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

                {viewMode === 'card' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedApps.map((app) => (
                      <AppCard key={app.id} app={app} categoryInfo={getCategoryInfo(app.category, categories)} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paginatedApps.map((app) => {
                      const categoryInfo = getCategoryInfo(app.category, categories);
                      return (
                        <Link
                          key={app.id}
                          href={`/apps/${app.id}`}
                          className="flex items-center justify-between p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-md transition"
                        >
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{categoryInfo.label}</p>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{app.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">{app.description}</p>
                          </div>
                          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r text-white ${badgeTone(app.category)}`}>
                            {categoryInfo.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold border ${page === currentPage
                          ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent'
                          : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showScrollTop && (
        <button
          onClick={scrollToListTop}
          className="fixed bottom-8 right-8 w-12 h-12 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-lg flex items-center justify-center hover:-translate-y-1 transition"
        >
          <FaArrowUp />
        </button>
      )}

      <Footer />
    </div>
  );
}
