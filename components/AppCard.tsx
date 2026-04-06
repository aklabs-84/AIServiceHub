'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { AIApp } from '@/types/database';
import { CategoryInfo, getCategoryInfo } from '@/lib/categories';
import { useState } from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { db, getBrowserClient } from '@/lib/database';

interface AppCardProps {
  app: AIApp;
  onLikeChange?: () => void;
  categoryInfo?: CategoryInfo;
  variant?: 'default' | 'compact' | 'list';
  rank?: number;
}

const getCategoryBg = (category: string) => {
  switch (category) {
    case 'chatbot': return 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600';
    case 'content-generation': return 'bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600';
    case 'data-analysis': return 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600';
    case 'image-generation': return 'bg-gradient-to-br from-pink-400 via-pink-500 to-pink-600';
    case 'code-assistant': return 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500';
    case 'translation': return 'bg-gradient-to-br from-indigo-400 via-indigo-500 to-indigo-600';
    case 'education': return 'bg-gradient-to-br from-red-400 via-red-500 to-red-600';
    case 'game': return 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600';
    case 'productivity': return 'bg-gradient-to-br from-teal-400 via-teal-500 to-teal-600';
    default: return 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 dark:from-gray-600 dark:via-gray-700 dark:to-gray-800';
  }
};

export default function AppCard({ app, onLikeChange, categoryInfo: providedCategoryInfo, variant = 'default', rank }: AppCardProps) {
  const categoryInfo = providedCategoryInfo || getCategoryInfo(app.category);
  const CategoryIcon = categoryInfo.icon;
  const [imageError, setImageError] = useState(false);
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(user ? app.likes.includes(user.id) : false);
  const [likeCount, setLikeCount] = useState(app.likeCount);
  const [isLiking, setIsLiking] = useState(false);

  const thumbnailPosition = app.thumbnailUrl
    ? { objectPosition: `${app.thumbnailPositionX ?? 50}% ${app.thumbnailPositionY ?? 50}%` }
    : undefined;
  const bgClass = getCategoryBg(app.category);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || isLiking) return;
    setIsLiking(true);
    try {
      const supabase = getBrowserClient();
      if (isLiked) {
        await db.apps.unlike(supabase, app.id, user.id);
        setIsLiked(false);
        setLikeCount(prev => prev - 1);
      } else {
        await db.apps.like(supabase, app.id, user.id);
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

  const isCompact = variant === 'compact';
  const isList = variant === 'list';

  if (isList) {
    return (
      <Link 
        href={`/apps/${app.id}`} 
        className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-all duration-300 active:scale-[0.98]"
      >
        {/* Rank Number (Optional) */}
        {rank !== undefined && (
          <div className="flex-none w-6 text-center">
            <span className={`text-lg font-black tracking-tighter ${rank <= 3 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-gray-700'}`}>
              {rank}
            </span>
          </div>
        )}

        {/* Small Fixed Thumbnail */}
        <div className="flex-none relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shadow-sm shadow-blue-500/5 group-hover:shadow-md transition-all duration-500">
          {app.thumbnailUrl && app.thumbnailUrl.trim() !== '' && !imageError ? (
            <Image
              src={app.thumbnailUrl}
              alt={app.name}
              fill
              sizes="80px"
              className="object-cover group-hover:scale-110 transition-transform duration-700"
              style={thumbnailPosition}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${bgClass} relative overflow-hidden`}>
              <CategoryIcon className="text-white/10 absolute -right-0.5 -bottom-0.5 rotate-12 text-5xl transition-transform duration-700 group-hover:scale-110" />
              <CategoryIcon className="text-white relative z-10 text-2xl transition-transform duration-500 group-hover:scale-110" />
            </div>
          )}
        </div>

        {/* Text Area (Larger) */}
        <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
          <h3 className="text-sm sm:text-base font-black text-gray-950 dark:text-white truncate leading-tight group-hover:text-blue-600 transition-colors">
            {app.name}
          </h3>
          <div className="flex items-center gap-2">
            <p className="text-[11px] sm:text-xs font-bold text-gray-400 dark:text-gray-500 truncate uppercase tracking-wide">
              {categoryInfo.label}
            </p>
            <span className="w-1 h-1 rounded-full bg-gray-200 dark:bg-gray-800" />
            <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-gray-400">
               <FaHeart className={`text-[9px] ${isLiked ? 'text-red-500' : ''}`} />
               <span>{likeCount}</span>
            </div>
          </div>
          {app.description && (
            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-1 font-medium opacity-80">
              {app.description}
            </p>
          )}
        </div>
        
        {/* Open Button (Icon only in List) */}
        <div className="flex-none opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 duration-300 hidden sm:block">
           <span className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-[10px] font-black shadow-lg shadow-blue-600/20">
              OPEN
           </span>
        </div>
      </Link>
    );
  }

  return (
    <Link 
      href={`/apps/${app.id}`} 
      className={`group flex flex-col gap-2 transition-all duration-300 cursor-pointer ${
        isCompact 
          ? 'p-1.5 sm:p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800/40' 
          : 'p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800/60'
      }`}
    >
      {/* Square App Icon */}
      <div className={`relative w-full aspect-square overflow-hidden shadow-sm group-hover:shadow-lg transition-all duration-500 ${
        isCompact ? 'rounded-2xl' : 'rounded-[22%]'
      }`}>
        {app.thumbnailUrl && app.thumbnailUrl.trim() !== '' && !imageError ? (
          <Image
            src={app.thumbnailUrl}
            alt={app.name}
            fill
            sizes={isCompact ? '128px' : '(max-width: 640px) 30vw, (max-width: 1024px) 20vw, 14vw'}
            className="object-cover group-hover:scale-110 transition-transform duration-700"
            style={thumbnailPosition}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${bgClass} relative overflow-hidden`}>
            <CategoryIcon className={`text-white/10 absolute -right-1 -bottom-1 rotate-12 transition-transform duration-700 group-hover:scale-110 ${
              isCompact ? 'text-5xl' : 'text-7xl'
            }`} />
            <CategoryIcon className={`text-white relative z-10 transition-transform duration-500 group-hover:scale-110 ${
              isCompact ? 'text-2xl' : 'text-4xl'
            }`} />
          </div>
        )}
      </div>

      {/* App Info */}
      <div className={`${isCompact ? 'px-0.5 space-y-1' : 'px-1 space-y-1.5'}`}>
        <div>
          <h3 className={`font-black text-gray-950 dark:text-white line-clamp-2 leading-tight transition-colors group-hover:text-blue-600 ${
            isCompact ? 'text-[11px] sm:text-[12px] min-h-[1.75rem]' : 'text-sm min-h-[2.25rem]'
          }`}>
            {app.name}
          </h3>
          <p className={`text-gray-400 dark:text-gray-500 truncate mt-0.5 font-bold ${
            isCompact ? 'text-[10px]' : 'text-xs'
          }`}>
            {categoryInfo.label}
          </p>
        </div>

        {/* Like + Open (Only for default variant or small screens if needed) */}
        {!isCompact && (
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleLike}
              disabled={!user || isLiking}
              className={`flex items-center gap-1 transition-colors ${isLiked ? 'text-red-500' : 'text-gray-300 dark:text-gray-600 hover:text-red-400'}`}
            >
              {isLiked ? <FaHeart className="text-[10px]" /> : <FaRegHeart className="text-[10px]" />}
              <span className="text-[10px] font-black">{likeCount}</span>
            </button>
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
              OPEN
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
