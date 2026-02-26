'use client';

import Image from 'next/image';
import type { Prompt } from '@/types/database';
import { PromptCategoryInfo, getPromptCategoryInfo } from '@/lib/promptCategories';
import { useMemo, useState } from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { db, getBrowserClient } from '@/lib/database';

interface PromptCardProps {
  prompt: Prompt;
  onLikeChange?: () => void;
  categoryInfo?: PromptCategoryInfo;
}

export default function PromptCard({ prompt, onLikeChange, categoryInfo: providedCategoryInfo }: PromptCardProps) {
  const router = useRouter();
  const categoryInfo = providedCategoryInfo || getPromptCategoryInfo(prompt.category);
  const CategoryIcon = categoryInfo.icon;
  const [imageError, setImageError] = useState(false);
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(user ? prompt.likes.includes(user.id) : false);
  const [likeCount, setLikeCount] = useState(prompt.likeCount ?? prompt.likes.length);
  const [isLiking, setIsLiking] = useState(false);

  const handleTagClick = (tag: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/prompts?tag=${encodeURIComponent(tag)}`);
  };

  const snsPreview = useMemo(() => prompt.snsUrls.slice(0, 2), [prompt.snsUrls]);
  const getLinkPreview = (url: string) => {
    const blogFallback = '/naver-blog.svg';
    const instagramFallback = '/instagram-icon.svg';
    const youtubeFallback = '/youtube.svg';
    const defaultFallback = '/globe.svg';

    const extractUrl = (raw: string) => {
      const httpMatch = raw.match(/https?:\/\/[^\s]+/);
      if (httpMatch) return httpMatch[0];
      const afterColon = raw.split(':').slice(1).join(':').trim();
      if (afterColon) return afterColon;
      return raw.trim();
    };

    const normalizeUrl = (raw: string) => {
      try {
        return new URL(raw);
      } catch {
        return new URL(`https://${raw}`);
      }
    };

    try {
      const parsed = normalizeUrl(extractUrl(url));
      const hostname = parsed.hostname.replace('www.', '');
      const host = hostname.toLowerCase();
      const isBlog = host.includes('blog.') || host.includes('naver.com') || host.includes('tistory') || host.includes('medium.com');
      const isInstagram = host.includes('instagram.com');
      const isYoutube = host.includes('youtube.com') || host.includes('youtu.be');
      const isTiktok = host.includes('tiktok.com');
      const isTwitter = host.includes('twitter.com') || host === 'x.com';
      const isNotion = host.includes('notion.site') || host.includes('notion.so');
      const isGoogleForm = host.includes('forms.gle') || host.includes('docs.google.com');

      let icon: 'instagram' | 'youtube' | 'tiktok' | 'twitter' | 'notion' | 'form' | 'blog' | undefined;
      if (isInstagram) icon = 'instagram';
      else if (isYoutube) icon = 'youtube';
      else if (isTiktok) icon = 'tiktok';
      else if (isTwitter) icon = 'twitter';
      else if (isNotion) icon = 'notion';
      else if (isGoogleForm) icon = 'form';
      else if (isBlog) icon = 'blog';

      const fallback = icon === 'instagram'
        ? instagramFallback
        : icon === 'youtube'
          ? youtubeFallback
          : icon === 'blog'
            ? blogFallback
            : defaultFallback;
      const favicon = icon
        ? fallback
        : `https://www.google.com/s2/favicons?sz=128&domain=${parsed.hostname}`;

      return { hostname, favicon, fallback, icon };
    } catch {
      return {
        hostname: url,
        favicon: defaultFallback,
        fallback: defaultFallback,
      };
    }
  };

  const getTrimmedDescription = (content: string, max = 220) => {
    if (content.length <= max) return content;
    return `${content.slice(0, max)}…`;
  };

  const badgeTone = (() => {
    switch (prompt.category) {
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
  })();

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || isLiking) return;

    setIsLiking(true);
    try {
      const supabase = getBrowserClient();
      if (isLiked) {
        await db.prompts.unlike(supabase, prompt.id, user.id);
        setIsLiked(false);
        setLikeCount((prev) => prev - 1);
      } else {
        await db.prompts.like(supabase, prompt.id, user.id);
        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
      }
      onLikeChange?.();
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div
      className="group relative flex flex-col h-full bg-white dark:bg-gray-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/10 group-hover:-translate-y-2 group-hover:scale-[1.02] cursor-pointer"
      onClick={() => router.push(`/prompts/${prompt.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(`/prompts/${prompt.id}`);
        }
      }}
    >
      {/* 썸네일 영역 */}
      <div className="relative aspect-[16/10] overflow-hidden">
        {prompt.thumbnailUrl && !imageError ? (
          <>
            <Image
              src={prompt.thumbnailUrl}
              alt={prompt.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              style={{
                objectPosition: `${prompt.thumbnailPositionX ?? 50}% ${prompt.thumbnailPositionY ?? 50}%`,
              }}
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </>
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${badgeTone} flex items-center justify-center relative overflow-hidden`}>
            <CategoryIcon className="text-white/20 text-8xl absolute -right-4 -bottom-4 rotate-12" />
            <CategoryIcon className="relative z-10 text-6xl text-white drop-shadow-2xl transition-transform duration-500 group-hover:scale-110" />
          </div>
        )}

        {/* 카테고리 배지 */}
        <div className="absolute top-4 left-4 z-20">
          <div className="px-3 py-1.5 rounded-xl backdrop-blur-md bg-white/90 dark:bg-gray-950/80 border border-white/20 dark:border-gray-800/50 shadow-sm flex items-center space-x-1.5">
            <CategoryIcon className="text-sm text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white">
              {categoryInfo.label}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white mb-3 line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {prompt.name}
          </h3>

          {/* 태그 영역 */}
          {prompt.tags && prompt.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {prompt.tags.slice(0, 3).map((tag) => (
                <button
                  key={tag}
                  onClick={(e) => handleTagClick(tag, e)}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all font-medium"
                >
                  #{tag}
                </button>
              ))}
              {prompt.tags.length > 3 && (
                <span className="text-[10px] font-bold text-gray-400 px-1 py-1">+{prompt.tags.length - 3}</span>
              )}
            </div>
          )}

          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3 h-[4.5rem]">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <span className="m-0">{children}</span>,
                ul: ({ children }) => <span className="m-0">{children}</span>,
                ol: ({ children }) => <span className="m-0">{children}</span>,
                li: ({ children }) => <span className="m-0">{children}</span>,
                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
              }}
            >
              {getTrimmedDescription(prompt.description, 150)}
            </ReactMarkdown>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-100 dark:border-emerald-900/50">
              {prompt.createdByName?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="text-xs font-bold text-gray-600 dark:text-gray-400 truncate max-w-[100px]">
              {prompt.createdByName}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex -space-x-1.5">
              {snsPreview.map((url, idx) => {
                const preview = getLinkPreview(url);
                return preview.favicon && (
                  <div key={idx} className="w-6 h-6 rounded-full bg-white dark:bg-gray-800 border-2 border-white dark:border-gray-900 shadow-sm flex items-center justify-center overflow-hidden">
                    <Image
                      src={preview.favicon}
                      alt="SNS"
                      width={14}
                      height={14}
                      className="object-contain"
                      onError={(e) => (e.currentTarget.src = '/globe.svg')}
                    />
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleLike}
              disabled={!user || isLiking}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all ${isLiked
                ? 'bg-red-50 dark:bg-red-900/20 text-red-500'
                : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-red-500'
                }`}
            >
              {isLiked ? <FaHeart className="text-xs" /> : <FaRegHeart className="text-xs" />}
              <span className="text-xs font-black">{likeCount}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

  );
}
