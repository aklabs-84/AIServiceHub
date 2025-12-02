'use client';

import { useEffect, useState } from 'react';
import { getAllApps, getAppsByCategory } from '@/lib/db';
import { AIApp, AppCategory } from '@/types/app';
import AppCard from '@/components/AppCard';
import { categories } from '@/lib/categories';
import { FaRocket, FaFilter } from 'react-icons/fa';

export default function Home() {
  const [apps, setApps] = useState<AIApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<AppCategory | 'all'>('all');

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

  return (
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

        {/* 통계 정보 */}
        <div className="mt-8 flex flex-wrap justify-center gap-4 sm:gap-8">
          <div className="bg-white dark:bg-gray-800 px-6 py-3 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {apps.length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">등록된 앱</div>
          </div>
          <div className="bg-white dark:bg-gray-800 px-6 py-3 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {categories.length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">카테고리</div>
          </div>
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
          <div className="mb-6 flex items-center justify-between">
            <p className="text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-800 dark:text-gray-200">{apps.length}개</span>의 앱을 찾았습니다
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {apps.map((app, index) => (
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
        </div>
      )}
    </div>
  );
}