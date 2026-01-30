'use client';

import Image from 'next/image';
import { Prompt } from '@/types/prompt';
import { PromptCategoryInfo, getPromptCategoryInfo } from '@/lib/promptCategories';
import { useMemo, useState } from 'react';
import { FaUser, FaHeart, FaRegHeart, FaTiktok, FaTwitter, FaFileAlt, FaClipboardList } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { likePrompt, unlikePrompt } from '@/lib/db';

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
      if (isLiked) {
        await unlikePrompt(prompt.id, user.id);
        setIsLiked(false);
        setLikeCount((prev) => prev - 1);
      } else {
        await likePrompt(prompt.id, user.id);
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
      className="group h-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg card-hover cursor-pointer flex flex-col"
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
      <div className="relative h-44 w-full">
        {prompt.thumbnailUrl && !imageError ? (
          <Image
            src={prompt.thumbnailUrl}
            alt={prompt.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            style={{
              objectPosition: `${prompt.thumbnailPositionX ?? 50}% ${prompt.thumbnailPositionY ?? 50}%`,
            }}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${badgeTone} flex items-center justify-center relative overflow-hidden`}>
            <div className="absolute inset-0 opacity-20">
              <div className="absolute -right-10 -bottom-10 h-28 w-28 bg-white rounded-full" />
              <div className="absolute -left-6 -top-8 h-20 w-20 bg-white rounded-full" />
            </div>
            <CategoryIcon className="relative z-10 text-6xl text-white drop-shadow-lg group-hover:scale-110 transition-transform duration-300" />
          </div>
        )}

        <div className="absolute top-3 right-3 z-10">
          <span className="rounded-full bg-white/80 dark:bg-gray-900/80 text-gray-800 dark:text-gray-100 text-xs font-semibold px-3 py-1 shadow">
            {categoryInfo.label}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-3 flex-1 flex flex-col">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
          {prompt.name}
        </h3>

        {/* 태그 영역 */}
        {prompt.tags && prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {prompt.tags.map((tag) => (
              <button
                key={tag}
                onClick={(e) => handleTagClick(tag, e)}
                className="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all font-medium"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FaUser className="text-emerald-500" />
            <span className="truncate">{prompt.createdByName}</span>
          </div>
          <button
            onClick={handleLike}
            disabled={!user || isLiking}
            className={`flex items-center space-x-1 transition-all ${isLiked
              ? 'text-red-500'
              : 'text-gray-400 hover:text-red-500'
              } ${!user ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            aria-label="좋아요 토글"
          >
            {isLiked ? <FaHeart /> : <FaRegHeart />}
            <span>{likeCount}</span>
          </button>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-4">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="m-0">{children}</p>,
              ul: ({ children }) => <ul className="m-0 list-disc list-inside space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="m-0 list-decimal list-inside space-y-1">{children}</ol>,
              li: ({ children }) => <li className="m-0">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            }}
          >
            {getTrimmedDescription(prompt.description)}
          </ReactMarkdown>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 mt-auto">
          {snsPreview.map((url, idx) => {
            const preview = getLinkPreview(url);
            const renderIcon = () => {
              switch (preview.icon) {
                case 'instagram':
                  return <Image src="/instagram-icon.svg" alt="Instagram" width={20} height={20} />;
                case 'youtube':
                  return <Image src="/youtube.svg" alt="YouTube" width={20} height={20} />;
                case 'tiktok':
                  return <FaTiktok className="text-gray-800 dark:text-white" />;
                case 'twitter':
                  return <FaTwitter className="text-sky-500" />;
                case 'notion':
                  return <FaFileAlt className="text-gray-700 dark:text-gray-200" />;
                case 'form':
                  return <FaClipboardList className="text-emerald-500" />;
                case 'blog':
                  return <Image src="/naver-blog.svg" alt="Naver Blog" width={20} height={20} />;
                default:
                  return null;
              }
            };
            return (
              <a
                key={idx}
                href={url}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2.5 py-1 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={preview.hostname}
              >
                <span className="relative h-5 w-5 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {renderIcon() ? (
                    renderIcon()
                  ) : (
                    <Image
                      src={preview.favicon}
                      alt={preview.hostname}
                      fill
                      sizes="20px"
                      className="object-contain"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        if (!target.src.includes(preview.fallback)) {
                          target.src = preview.fallback;
                        }
                      }}
                    />
                  )}
                </span>
              </a>
            );
          })}
          {prompt.snsUrls.length > 2 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
              +{prompt.snsUrls.length - 2}
            </span>
          )}
        </div>

      </div>
    </div>
  );
}
