'use client';

import Link from 'next/link';
import Image from 'next/image';
import { AIApp } from '@/types/app';
import { getCategoryInfo } from '@/lib/categories';
import { useState } from 'react';
import { FaCalendar, FaHeart, FaRegHeart, FaUser } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { likeApp, unlikeApp } from '@/lib/db';

interface AppCardProps {
  app: AIApp;
  onLikeChange?: () => void;
}

export default function AppCard({ app, onLikeChange }: AppCardProps) {
  const categoryInfo = getCategoryInfo(app.category);
  const CategoryIcon = categoryInfo.icon;
  const [imageError, setImageError] = useState(false);
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(user ? app.likes.includes(user.uid) : false);
  const [likeCount, setLikeCount] = useState(app.likeCount);
  const [isLiking, setIsLiking] = useState(false);
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

          <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 flex-1 leading-relaxed">
            {app.description}
          </p>

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
                className={`flex items-center space-x-1 text-sm transition-all ${
                  isLiked
                    ? 'text-red-500'
                    : 'text-gray-400 hover:text-red-500'
                } ${!user ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {isLiked ? <FaHeart /> : <FaRegHeart />}
                <span>{likeCount}</span>
              </button>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <FaCalendar className="text-blue-500 dark:text-blue-400" />
              <span>{new Date(app.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
