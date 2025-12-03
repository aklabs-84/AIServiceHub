'use client';

import { useEffect, useState } from 'react';
import { getAllPrompts, getPromptsByCategory } from '@/lib/db';
import { Prompt } from '@/types/prompt';
import { promptCategories } from '@/lib/promptCategories';
import PromptCard from '@/components/PromptCard';
import Link from 'next/link';
import { FaFeatherAlt, FaFilter, FaPlus } from 'react-icons/fa';
import { categories } from '@/lib/categories';

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Prompt['category'] | 'all'>('all');

  useEffect(() => {
    loadPrompts();
  }, [selectedCategory]);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const data =
        selectedCategory === 'all'
          ? await getAllPrompts()
          : await getPromptsByCategory(selectedCategory);
      setPrompts(data);
    } catch (error) {
      console.error('Error loading prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* 히어로 */}
      <div className="text-center mb-12 md:mb-16 animate-fadeIn">
        <div className="inline-flex items-center space-x-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-4 py-2 rounded-full mb-6 text-sm font-medium">
          <FaFeatherAlt />
          <span>프롬프트, 아이디어를 더 깊게</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 text-gray-900 dark:text-gray-50">
          <span className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 bg-clip-text text-transparent">
            프롬프트 아카이브
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
          실전에서 검증한 프롬프트와 상세한 활용 팁, SNS 소개 링크까지 한 곳에서 살펴보세요.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4 sm:gap-6">
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
        <div className="animate-fadeIn">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-800 dark:text-gray-200">{prompts.length}개</span>의 프롬프트를 찾았습니다
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {prompts.map((prompt, index) => (
              <div
                key={prompt.id}
                style={{
                  animationDelay: `${index * 0.05}s`
                }}
                className="animate-fadeIn"
              >
                <PromptCard prompt={prompt} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
