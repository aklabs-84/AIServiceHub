'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AIApp } from '@/types/app';
import { CategoryInfo, getCategoryInfo } from '@/lib/categories';
import { useMemo, useState } from 'react';
import { FaHeart, FaRegHeart, FaUser, FaTiktok, FaTwitter, FaFileAlt, FaClipboardList } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { likeApp, unlikeApp } from '@/lib/db';

interface AppCardProps {
  app: AIApp;
  onLikeChange?: () => void;
  categoryInfo?: CategoryInfo;
}

export default function AppCard({ app, onLikeChange, categoryInfo: providedCategoryInfo }: AppCardProps) {
  const categoryInfo = providedCategoryInfo || getCategoryInfo(app.category);
  const CategoryIcon = categoryInfo.icon;
  const router = useRouter();

  const handleTagClick = (tag: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/apps?tag=${encodeURIComponent(tag)}`);
  };
  const [imageError, setImageError] = useState(false);
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(user ? app.likes.includes(user.uid) : false);
  const [likeCount, setLikeCount] = useState(app.likeCount);
  const [isLiking, setIsLiking] = useState(false);
  const thumbnailPosition = app.thumbnailUrl
    ? { objectPosition: `${app.thumbnailPositionX ?? 50}% ${app.thumbnailPositionY ?? 50}%` }
    : undefined;
  const categoryBackground = (() => {
    switch (app.category) {
      case 'chatbot':
        return 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600';
      case 'content-generation':
        return 'bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600';
      case 'data-analysis':
        return 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600';
      case 'image-generation':
        return 'bg-gradient-to-br from-pink-400 via-pink-500 to-pink-600';
      case 'code-assistant':
        return 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500';
      case 'translation':
        return 'bg-gradient-to-br from-indigo-400 via-indigo-500 to-indigo-600';
      case 'education':
        return 'bg-gradient-to-br from-red-400 via-red-500 to-red-600';
      case 'game':
        return 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600';
      case 'productivity':
        return 'bg-gradient-to-br from-teal-400 via-teal-500 to-teal-600';
      case 'other':
      default:
        return 'bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 dark:from-gray-700 dark:via-gray-800 dark:to-gray-900';
    }
  })();

  const snsPreview = useMemo(() => app.snsUrls.slice(0, 3), [app.snsUrls]);
  const plainDescription = useMemo(() => {
    const raw = app.description || '';
    return raw
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/!\[.*?\]\(.*?\)/g, ' ')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      .replace(/^\s{0,3}[-*+]\s+/gm, '')
      .replace(/^\s{0,3}\d+\.\s+/gm, '')
      .replace(/[*_~]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }, [app.description]);
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

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || isLiking) return;

    setIsLiking(true);
    try {
      if (isLiked) {
        await unlikeApp(app.id, user.uid);
        setIsLiked(false);
        setLikeCount(prev => prev - 1);
      } else {
        await likeApp(app.id, user.uid);
        setIsLiked(true);
        setLikeCount(prev => prev + 1);
      }
      onLikeChange?.();
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <Link href={`/apps/${app.id}`} className="group">
      <div className="card-hover bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden cursor-pointer h-full flex flex-col border border-gray-200 dark:border-gray-700">
        {/* 썸네일 또는 카테고리 아이콘 */}
        <div className="relative w-full h-48 overflow-hidden">
          {app.thumbnailUrl && !imageError ? (
            <div className="relative w-full h-full">
              <Image
                src={app.thumbnailUrl}
                alt={app.name}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
                style={thumbnailPosition}
                onError={() => setImageError(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${categoryBackground} relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-20">
                <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white rounded-full" />
                <div className="absolute -left-8 -top-8 w-24 h-24 bg-white rounded-full" />
              </div>
              <CategoryIcon className="text-white text-7xl drop-shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-300" />
            </div>
          )}

          {/* 카테고리 배지 - 썸네일 위에 오버레이 */}
          <div className="absolute top-3 right-3 z-10">
            <span className={`text-xs px-3 py-1.5 rounded-full text-white ${categoryInfo.color} backdrop-blur-sm bg-opacity-90 font-medium shadow-lg`}>
              {categoryInfo.label}
            </span>
          </div>
        </div>

        {/* 카드 내용 */}
        <div className="p-5 flex-1 flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {app.name}
          </h3>

          {/* 태그 영역 */}
          {app.tags && app.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {app.tags.map((tag) => (
                <button
                  key={tag}
                  onClick={(e) => handleTagClick(tag, e)}
                  className="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-md bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-all font-medium"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 flex-1 leading-relaxed">
            {plainDescription}
          </p>

          {/* SNS 미리보기 */}
          {app.snsUrls.length > 0 && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
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
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }}
                      className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-1 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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
                    </button>
                  );
                })}
                {app.snsUrls.length > snsPreview.length && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                    +{app.snsUrls.length - snsPreview.length}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 하단 정보 */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                <FaUser className="text-purple-500 dark:text-purple-400" />
                <span>{app.createdByName}</span>
              </div>
              <button
                onClick={handleLike}
                disabled={!user || isLiking}
                className={`flex items-center space-x-1 text-sm transition-all ${isLiked
                    ? 'text-red-500'
                    : 'text-gray-400 hover:text-red-500'
                  } ${!user ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {isLiked ? <FaHeart /> : <FaRegHeart />}
                <span>{likeCount}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
