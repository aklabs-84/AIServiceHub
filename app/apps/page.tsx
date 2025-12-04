'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAllApps, getAppsByCategory } from '@/lib/db';
import { AIApp, AppCategory } from '@/types/app';
import AppCard from '@/components/AppCard';
import { categories, getCategoryInfo } from '@/lib/categories';
import { FaFilter, FaList, FaPlus, FaRocket, FaSearch, FaThLarge, FaUser } from 'react-icons/fa';
import Link from 'next/link';
import Footer from '@/components/Footer';

export default function AppsPage() {
  const [apps, setApps] = useState<AIApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<AppCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadApps();
  }, [selectedCategory]);

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

  const filteredApps = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return apps;
    return apps.filter((app) => {
      const name = app.name.toLowerCase();
      const author = app.createdByName.toLowerCase();
      const desc = app.description.toLowerCase();
      return name.includes(term) || author.includes(term) || desc.includes(term);
    });
  }, [apps, searchTerm]);

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

  return (
    <>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* 히어로 섹션 */}
        <div className="text-center mb-12 md:mb-16 animate-fadeIn">
          <div className="inline-flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full mb-6 text-sm font-medium">
            <FaRocket />
            <span>AI로 만드는 무한한 가능성</span>
          </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 md:mb-6">
          <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            바이브코딩
          </span>
          <br />
          <span className="text-gray-800 dark:text-gray-100">AI 앱 스튜디오</span>
        </h1>

        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
          바이브코딩으로 만든 다양한 AI 서비스를 발견하고 공유하세요
        </p>
        {/* 통계 + 등록 버튼 */}
        <div className="mt-8 flex flex-wrap items-stretch justify-center gap-4 sm:gap-6">
          <div className="bg-white dark:bg-gray-800 px-6 py-3 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col justify-center min-h-[78px]">
            <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {apps.length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">등록된 앱</div>
          </div>
          <div className="bg-white dark:bg-gray-800 px-6 py-3 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col justify-center min-h-[78px]">
            <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {categories.length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">카테고리</div>
          </div>
          <Link
            href="/apps/new"
            className="inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 border border-gray-900 dark:border-white font-semibold shadow-sm hover:-translate-y-0.5 transition-all h-full min-h-[78px]"
          >
            <FaPlus />
            <span>앱 등록</span>
          </Link>
        </div>
      </div>

        {/* 카테고리 필터 */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center justify-center mb-4">
            <FaFilter className="text-gray-600 dark:text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">카테고리</h2>
          </div>

        <div className="flex flex-wrap gap-2 sm:gap-3 justify-center max-w-5xl mx-auto">
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

        {/* 앱 목록 */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 md:py-32">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
              <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-900"></div>
            </div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">앱을 불러오는 중...</p>
          </div>
        ) : apps.length === 0 ? (
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
          <div className="animate-fadeIn">
            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
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
                {filteredApps.map((app, index) => (
                  <div
                    key={app.id}
                    style={{
                      animationDelay: `${index * 0.05}s`
                    }}
                    className="animate-fadeIn"
                  >
                    <AppCard app={app} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {filteredApps.map((app, index) => {
                  const categoryInfo = getCategoryInfo(app.category);
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
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
