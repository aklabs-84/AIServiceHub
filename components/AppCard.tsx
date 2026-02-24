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

export default function AppCard({ app, onLikeChange, categoryInfo: providedCategoryInfo }: AppCardProps) {
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

  return (
    <Link href={`/apps/${app.id}`} className="group flex flex-col gap-2 p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-all duration-200 cursor-pointer">
      {/* Square App Icon */}
      <div className="relative w-full aspect-square rounded-[22%] overflow-hidden shadow-sm group-hover:shadow-lg transition-shadow duration-300">
        {app.thumbnailUrl && !imageError ? (
          <Image
            src={app.thumbnailUrl}
            alt={app.name}
            fill
            sizes="(max-width: 640px) 30vw, (max-width: 1024px) 20vw, 14vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            style={thumbnailPosition}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${bgClass} relative overflow-hidden`}>
            <CategoryIcon className="text-white/15 text-7xl absolute -right-2 -bottom-2 rotate-12" />
            <CategoryIcon className="text-white text-4xl relative z-10" />
          </div>
        )}
      </div>

      {/* App Info */}
      <div className="px-0.5 space-y-1.5">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-tight min-h-[2.25rem]">
            {app.name}
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
            {categoryInfo.label}
          </p>
        </div>

        {/* Like + Open */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleLike}
            disabled={!user || isLiking}
            className={`flex items-center gap-1 transition-colors ${isLiked ? 'text-red-500' : 'text-gray-300 dark:text-gray-600 hover:text-red-400'}`}
          >
            {isLiked ? <FaHeart className="text-[10px]" /> : <FaRegHeart className="text-[10px]" />}
            <span className="text-[10px] font-bold">{likeCount}</span>
          </button>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
            열기
          </span>
        </div>
      </div>
    </Link>
  );
}
