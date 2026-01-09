'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getAllApps, getAppsByCategory } from '@/lib/db';
import { AIApp, AppCategory } from '@/types/app';
import AppCard from '@/components/AppCard';
import { getCategoryInfo } from '@/lib/categories';
import { useAppCategories } from '@/lib/useCategories';
import { FaFilter, FaHome, FaList, FaPlus, FaRocket, FaSearch, FaThLarge, FaUser, FaArrowUp } from 'react-icons/fa';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';

export default function AppsPage() {
  const [apps, setApps] = useState<AIApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<AppCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { categories } = useAppCategories();
  const itemsPerPage = viewMode === 'card' ? 12 : 10;
  const { user } = useAuth();
  const listTopRef = useRef<HTMLDivElement | null>(null);
  const listControlsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCurrentPage(1);
    loadApps();
  }, [selectedCategory]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);
  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode]);
  useEffect(() => {
    if (selectedCategory === 'all') return;
    if (categories.length === 0) return;
    if (!categories.find((cat) => cat.value === selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [categories, selectedCategory]);

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

  const loadApps = async () => {
    setLoading(true);
    try {
        const data = selectedCategory === 'all'
        ? await getAllApps()
        : await getAppsByCategory(selectedCategory);
      setApps(data);
    } catch (error) {
      console.error('Error loading apps:', error);
    } finally {
      setLoading(false);
    }
  };

  const visibleApps = useMemo(() => {
    const uid = user?.uid;
    return apps.filter((app) => (app.isPublic ?? true) || app.createdBy === uid);
  }, [apps, user?.uid]);

  const filteredApps = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return visibleApps;
    return visibleApps.filter((app) => {
      const name = app.name.toLowerCase();
      const author = app.createdByName.toLowerCase();
      const desc = app.description.toLowerCase();
      return name.includes(term) || author.includes(term) || desc.includes(term);
    });
  }, [visibleApps, searchTerm]);

  const totalPages = Math.ceil(filteredApps.length / itemsPerPage);
  const paginatedApps = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredApps.slice(start, start + itemsPerPage);
  }, [filteredApps, currentPage, itemsPerPage]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
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
                onClick={() => setSelectedCategory('all')}
                className={`w-full text-left px-4 py-2.5 rounded-xl border font-medium transition ${
                  selectedCategory === 'all'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-md'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                전체
              </button>
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl border font-medium transition flex items-center gap-2 ${
                      selectedCategory === category.value
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
          </aside>

          <section className="min-w-0 md:w-[78%] lg:w-[80%] space-y-10">
            {/* 히어로 섹션 */}
              <div className="text-left mb-8 md:mb-10 animate-fadeIn">
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <Link href="/" className="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200">
                  <FaHome className="text-base" />
                  <span>홈</span>
                </Link>
                <span className="text-gray-400 dark:text-gray-500">/</span>
                <span className="font-medium text-gray-600 dark:text-gray-300">바이브코딩</span>
              </div>
              <div className="inline-flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full mb-6 text-sm font-medium">
                <FaRocket />
                <span>AI로 만드는 무한한 가능성</span>
              </div>

              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
                <div>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 md:mb-5">
                    <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                      바이브코딩
                    </span>
                    <br />
                    <span className="text-gray-800 dark:text-gray-100">AI 앱 스튜디오</span>
                  </h1>
                  <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
                    바이브코딩으로 만든 다양한 AI 서비스를 발견하고 공유하세요
                  </p>
                </div>

                <div className="w-full max-w-xs space-y-3 sm:space-y-4 lg:space-y-5">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-white dark:bg-gray-800 px-5 py-3 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col justify-center w-full">
                      <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {visibleApps.length}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">등록된 앱</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 px-5 py-3 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col justify-center w-full">
                      <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {categories.length}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">카테고리</div>
                    </div>
                  </div>
                  <Link
                    href="/apps/new"
                    className="inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 border border-gray-900 dark:border-white font-semibold shadow-sm hover:-translate-y-0.5 transition-all w-full"
                  >
                    <FaPlus />
                    <span>앱 등록</span>
                  </Link>
                </div>
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
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full transition-all transform hover:scale-105 font-medium shadow-md ${
                    selectedCategory === 'all'
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
                      onClick={() => setSelectedCategory(category.value)}
                      className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full transition-all transform hover:scale-105 flex items-center space-x-2 font-medium shadow-md ${
                        selectedCategory === category.value
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
            {loading ? (
              <div className="flex flex-col justify-center items-center py-20 md:py-32">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-900"></div>
                </div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">앱을 불러오는 중...</p>
              </div>
            ) : visibleApps.length === 0 ? (
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
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="제목 또는 작성자로 검색"
                        className="w-full sm:w-64 lg:w-72 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 pl-9 pr-4 py-2 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        aria-label="앱 검색"
                      />
                    </div>
                  </div>
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

                {filteredApps.length === 0 ? (
                  <div className="text-center py-16 sm:py-20">
                    <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">검색 결과가 없습니다</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">다른 키워드나 카테고리를 시도해 주세요.</p>
                  </div>
                ) : viewMode === 'card' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {paginatedApps.map((app, index) => (
                      <div
                        key={app.id}
                        style={{
                          animationDelay: `${index * 0.05}s`
                        }}
                        className="animate-fadeIn"
                      >
                        <AppCard app={app} categoryInfo={getCategoryInfo(app.category, categories)} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {paginatedApps.map((app, index) => {
                      const categoryInfo = getCategoryInfo(app.category, categories);
                      const CategoryIcon = categoryInfo.icon;
                      return (
                        <Link
                          key={app.id}
                          href={`/apps/${app.id}`}
                          style={{
                            animationDelay: `${index * 0.05}s`
                          }}
                          className="group flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 sm:px-5 py-3 sm:py-4 shadow-sm hover:shadow-md transition hover:-translate-y-0.5 animate-fadeIn"
                        >
                          <div
                            className={`h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center rounded-xl bg-gradient-to-br ${badgeTone(
                              app.category
                            )} text-white shadow-inner`}
                          >
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
                {filteredApps.length > 0 && totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                      disabled={currentPage === 1}
                    >
                      이전
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-200">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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
