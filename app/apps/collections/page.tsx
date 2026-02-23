import { getServerClient } from '@/lib/database/server';
import { db } from '@/lib/database';
import Link from 'next/link';
import Image from 'next/image';
import { FaHome, FaArrowLeft } from 'react-icons/fa';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CollectionsPage() {
  const client = await getServerClient();
  const collections = await db.collections.getPublished(client).catch(() => []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* 헤더 */}
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
          <span className="font-semibold text-gray-900 dark:text-white">기획 컬렉션</span>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-screen-xl">

        <Link
          href="/apps"
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition mb-6"
        >
          <FaArrowLeft className="text-xs" />
          앱 목록으로
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">기획 컬렉션</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            엄선된 AI 앱 컬렉션을 살펴보세요.
          </p>
        </div>

        {collections.length === 0 ? (
          <div className="text-center py-24 text-gray-500 dark:text-gray-400">
            <p className="text-lg font-semibold mb-2">아직 공개된 컬렉션이 없습니다</p>
            <p className="text-sm">곧 새로운 컬렉션이 추가될 예정입니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {collections.map((col) => (
              <Link
                key={col.id}
                href={`/apps/collections/${col.slug}`}
                className="group relative h-64 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300"
              >
                {/* 히어로 이미지 */}
                {col.heroImageUrl || col.cardImageUrl ? (
                  <Image
                    src={col.heroImageUrl || col.cardImageUrl!}
                    alt={col.title}
                    fill
                    unoptimized
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800" />
                )}

                {/* 오버레이 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* 앱 개수 뱃지 */}
                {col.appIds.length > 0 && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs font-semibold">
                    앱 {col.appIds.length}개
                  </div>
                )}

                {/* 텍스트 */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  {col.subtitle && (
                    <p className="text-white/70 text-xs font-semibold mb-1">{col.subtitle}</p>
                  )}
                  <h2 className="text-white font-black text-lg leading-tight line-clamp-2 mb-1">
                    {col.title}
                  </h2>
                  {col.description && (
                    <p className="text-white/60 text-xs line-clamp-1">{col.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
