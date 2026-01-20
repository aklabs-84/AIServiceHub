'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAppsByUser } from '@/lib/db';
import { AIApp } from '@/types/app';
import AppCard from '@/components/AppCard';
import Link from 'next/link';
import { FaPlus } from 'react-icons/fa';

export default function MyAppsPage() {
  const { user, signInWithGoogle } = useAuth();
  const [apps, setApps] = useState<AIApp[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMyApps = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await getAppsByUser(user.uid);
      setApps(data);
    } catch (error) {
      console.error('Error loading my apps:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadMyApps();
    } else {
      setLoading(false);
    }
  }, [user, loadMyApps]);

  // 로그인하지 않은 경우
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          로그인이 필요합니다
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          내 앱을 보려면 Google 계정으로 로그인해주세요.
        </p>
        <button
          onClick={signInWithGoogle}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Google 로그인
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
          내가 등록한 앱
        </h1>
        <Link
          href="/apps/new"
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <FaPlus />
          <span>새 앱 등록</span>
        </Link>
      </div>

      {/* 앱 목록 */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : apps.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800">
          <p className="text-gray-500 dark:text-gray-300 text-lg mb-4">
            등록한 앱이 없습니다
          </p>
          <p className="text-gray-400 dark:text-gray-500 mb-6">
            첫 번째 앱을 등록해보세요!
          </p>
          <Link
            href="/apps/new"
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            <FaPlus />
            <span>앱 등록하기</span>
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-4 text-gray-600 dark:text-gray-400">
            총 {apps.length}개의 앱
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {apps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
