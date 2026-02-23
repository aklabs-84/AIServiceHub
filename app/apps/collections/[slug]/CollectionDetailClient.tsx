'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FaArrowLeft, FaHome } from 'react-icons/fa';
import type { Collection, AIApp } from '@/types/database';
import AppCard from '@/components/AppCard';
import { getCategoryInfo } from '@/lib/categories';
import { useAppCategories } from '@/lib/useCategories';

interface Props {
  collection: Collection;
  featuredApps: AIApp[];
}

export default function CollectionDetailClient({ collection, featuredApps }: Props) {
  const { categories } = useAppCategories();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* 브레드크럼 */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/" className="hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
            <FaHome className="text-xs" />
          </Link>
          <span className="text-gray-300 dark:text-gray-700">/</span>
          <Link href="/apps" className="hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
            바이브코딩
          </Link>
          <span className="text-gray-300 dark:text-gray-700">/</span>
          <span className="font-semibold text-gray-900 dark:text-white truncate max-w-48">{collection.title}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-screen-xl">

        {/* 뒤로가기 */}
        <Link
          href="/apps"
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition mb-8"
        >
          <FaArrowLeft className="text-xs" />
          목록으로
        </Link>

        <div className="lg:grid lg:grid-cols-5 lg:gap-12">

          {/* 좌측: 히어로 이미지 + 앱 목록 (sticky) */}
          <div className="lg:col-span-2 lg:sticky lg:top-20 lg:self-start">

            {/* 히어로 이미지 */}
            <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 mb-6 shadow-2xl">
              {collection.heroImageUrl ? (
                <Image
                  src={collection.heroImageUrl}
                  alt={collection.title}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-8 text-center">
                  <div className="text-5xl font-black mb-4 leading-tight">{collection.title}</div>
                </div>
              )}

              {/* 소제목 + 제목 오버레이 */}
              <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/50 to-transparent">
                {collection.subtitle && (
                  <p className="text-white/80 text-xs font-semibold mb-1">{collection.subtitle}</p>
                )}
                <h1 className="text-white text-2xl font-black leading-tight">{collection.title}</h1>
              </div>
            </div>

          </div>

          {/* 우측: 에디토리얼 본문 */}
          <div className="lg:col-span-3 mt-8 lg:mt-0">

            {/* 제목 영역 */}
            <div className="mb-8">
              {collection.subtitle && (
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">{collection.subtitle}</p>
              )}
              <h2 className="text-3xl font-black text-gray-900 dark:text-white leading-tight mb-3">
                {collection.title}
              </h2>
              {collection.description && (
                <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed">
                  {collection.description}
                </p>
              )}
            </div>

            {/* 에디토리얼 본문 */}
            {collection.editorialContent && (
              <div className="prose prose-gray dark:prose-invert max-w-none mb-10">
                {collection.editorialContent.split('\n\n').map((paragraph, i) => {
                  const trimmed = paragraph.trim();
                  if (!trimmed) return null;
                  return (
                    <p key={i} className="text-gray-700 dark:text-gray-300 text-base leading-relaxed mb-5 last:mb-0">
                      {trimmed.split('\n').map((line, j) => (
                        <span key={j}>
                          {line}
                          {j < trimmed.split('\n').length - 1 && <br />}
                        </span>
                      ))}
                    </p>
                  );
                })}
              </div>
            )}

            {/* 전체 앱 목록 (6개 초과 시) */}
            {featuredApps.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-800 pt-8">
                <h3 className="text-base font-black text-gray-900 dark:text-white mb-4">
                  이 컬렉션의 앱 ({featuredApps.length}개)
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {featuredApps.map((app) => (
                    <AppCard
                      key={app.id}
                      app={app}
                      categoryInfo={getCategoryInfo(app.category, categories)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
