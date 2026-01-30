'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getLikedAppsByUser } from '@/lib/db';
import { AIApp } from '@/types/app';
import { useAuth } from '@/contexts/AuthContext';
import AppCard from '@/components/AppCard';
import { FaHeart } from 'react-icons/fa';

export default function LikedAppsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [apps, setApps] = useState<AIApp[]>([]);
  const [loading, setLoading] = useState(true);

  const loadApps = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await getLikedAppsByUser(user.id);
      setApps(data);
    } catch (error) {
      console.error('Error loading liked apps:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      loadApps();
    }
  }, [user, authLoading, router, loadApps]);

  if (authLoading || loading) {
    return (
      <div className="flex flex-col justify-center items-center py-20 md:py-32">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
          <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-900"></div>
        </div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">앱을 불러오는 중...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* 헤더 */}
      <div className="mb-8 md:mb-12">
        <div className="flex items-center space-x-3 mb-4">
          <FaHeart className="text-red-500 text-2xl" />
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">
            내가 좋아요한 앱
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          총 <span className="font-semibold text-gray-800 dark:text-gray-200">{apps.length}개</span>의 앱을 좋아요했습니다
        </p>
      </div>

      {/* 앱 목록 */}
      {apps.length === 0 ? (
        <div className="text-center py-20 md:py-32 animate-fadeIn">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaHeart className="text-white text-3xl" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            좋아요한 앱이 없습니다
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            마음에 드는 앱에 좋아요를 눌러보세요!
          </p>
        </div>
      ) : (
        <div className="animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {apps.map((app, index) => (
              <div
                key={app.id}
                style={{
                  animationDelay: `${index * 0.05}s`
                }}
                className="animate-fadeIn"
              >
                <AppCard app={app} onLikeChange={loadApps} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
