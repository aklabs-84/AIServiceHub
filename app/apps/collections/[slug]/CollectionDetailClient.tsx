'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FaArrowLeft, FaHome, FaEdit } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import type { Collection, AIApp } from '@/types/database';
import AppCard from '@/components/AppCard';
import { getCategoryInfo } from '@/lib/categories';
import { useAppCategories } from '@/lib/useCategories';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  collection: Collection;
  featuredApps: AIApp[];
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

export default function CollectionDetailClient({ collection, featuredApps }: Props) {
  const { categories } = useAppCategories();
  const { isAdmin } = useAuth();

  const markdownComponents: Components = {
    h1: (props) => <h1 className="text-3xl font-bold mt-6 mb-4 text-gray-900 dark:text-gray-100" {...props} />,
    h2: (props) => <h2 className="text-2xl font-semibold mt-5 mb-3 text-gray-900 dark:text-gray-100" {...props} />,
    h3: (props) => <h3 className="text-xl font-semibold mt-4 mb-2 text-gray-900 dark:text-gray-100" {...props} />,
    p: (props) => <p className="leading-relaxed mb-4 last:mb-0" {...props} />,
    ul: (props) => <ul className="list-disc list-outside pl-5 space-y-2 mb-4" {...props} />,
    ol: (props) => <ol className="list-decimal list-outside pl-5 space-y-2 mb-4" {...props} />,
    li: (props) => <li className="leading-relaxed" {...props} />,
    strong: (props) => <strong className="font-bold text-gray-900 dark:text-white" {...props} />,
    em: (props) => <em className="italic" {...props} />,
    blockquote: (props) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-700 pl-4 py-1 italic text-gray-600 dark:text-gray-400 mb-4" {...props} />,
    a: ({ href, children, ...props }) => {
      if (!href) return <a {...props}>{children}</a>;
      if (href.startsWith('http')) {
        return (
          <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props}>
            {children}
          </a>
        );
      }
      return (
        <Link href={href} className="text-blue-600 dark:text-blue-400 hover:underline" {...props}>
          {children}
        </Link>
      );
    },
    code: ({ inline, className, children, ...props }: any) => {
      if (inline) {
        return (
          <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm font-mono" {...props}>
            {children}
          </code>
        );
      }
      return (
        <pre className="overflow-x-auto rounded-xl bg-gray-900 text-gray-100 text-sm p-4 mb-4 font-mono">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      );
    },
  };

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

        {/* 상단 버튼 영역 */}
        <div className="flex items-center justify-between mb-8">
          {/* 뒤로가기 */}
          <Link
            href="/apps"
            className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
          >
            <FaArrowLeft className="text-xs" />
            목록으로
          </Link>

          {/* 관리자 도구 */}
          {isAdmin && (
            <Link
              href={`/admin/collections/${collection.id}/edit`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
            >
              <FaEdit className="text-xs" />
              수정 / 삭제
            </Link>
          )}
        </div>

        <div className="lg:grid lg:grid-cols-5 lg:gap-12">

          {/* 좌측: 히어로 이미지 + 앱 목록 (sticky) */}
          <div className="lg:col-span-2 lg:sticky lg:top-20 lg:self-start">

            {/* 히어로 이미지 */}
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 mb-6 shadow-2xl">
              {collection.heroImageUrl ? (
                <Image
                  src={resolveImageUrl(collection.heroImageUrl)}
                  alt={collection.title}
                  fill
                  priority
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

            {/* 본문 내용 */}
            {collection.editorialContent && (
              <div className="prose prose-slate dark:prose-invert max-w-none text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-10">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {collection.editorialContent}
                </ReactMarkdown>
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
