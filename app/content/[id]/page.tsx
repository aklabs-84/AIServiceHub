import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerClient } from '@/lib/database/server';
import { db } from '@/lib/database';
import { ArrowLeft } from 'lucide-react';

const BASE_URL = 'https://ai-service-hub.vercel.app';

const TOPIC_LABELS: Record<string, string> = {
  news: 'AI 소식',
  showcase: '앱 자랑',
  idea: '아이디어',
  tip: '팁 & 노하우',
  question: '질문',
  chat: '자유 토크',
};

type PageProps = { params: Promise<{ id: string }> };

function getExcerpt(text: string, len: number) {
  const plain = text.replace(/[#*`>_~\[\]]/g, '').trim();
  return plain.length > len ? plain.slice(0, len) + '…' : plain;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const client = await getServerClient();
  const post = await db.posts.getById(client, id);

  if (!post) return { title: '아크의실험실' };

  const title = `${getExcerpt(post.content, 40)} | 아크의실험실`;
  const description = getExcerpt(post.content, 120);
  const image = post.images?.[0] || `${BASE_URL}/ai-labs-og.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/content/${id}`,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function ContentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const client = await getServerClient();
  const post = await db.posts.getById(client, id);

  if (!post) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: getExcerpt(post.content, 110),
    description: getExcerpt(post.content, 200),
    url: `${BASE_URL}/content/${post.id}`,
    datePublished: post.createdAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: {
      '@type': 'Person',
      name: post.authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: '아크의실험실',
      url: BASE_URL,
    },
    ...(post.images?.[0] && { image: post.images[0] }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <Link
            href="/content"
            className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            커뮤니티로 돌아가기
          </Link>

          <article>
            {/* 토픽 + 날짜 */}
            <div className="flex items-center gap-3 mb-4">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                {TOPIC_LABELS[post.topic] ?? post.topic}
              </span>
              <time
                dateTime={post.createdAt.toISOString()}
                className="text-xs text-gray-400"
              >
                {post.createdAt.toLocaleDateString('ko-KR', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </time>
            </div>

            {/* 본문 */}
            <div className="text-gray-800 dark:text-gray-200 text-base leading-relaxed whitespace-pre-wrap break-words mb-6">
              {post.content}
            </div>

            {/* 이미지 */}
            {post.images.length > 0 && (
              <div className="space-y-3 mb-6">
                {post.images.map((src, i) => (
                  <div key={i} className="relative w-full rounded-2xl overflow-hidden">
                    <Image
                      src={src}
                      alt={`이미지 ${i + 1}`}
                      width={800}
                      height={600}
                      className="w-full h-auto object-contain"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* 작성자 */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                {post.authorName?.[0] ?? '?'}
              </div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {post.authorName}
              </span>
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
