'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getAppById, deleteApp, likeApp, unlikeApp } from '@/lib/db';
import { AIApp } from '@/types/app';
import { useAuth } from '@/contexts/AuthContext';
import { getCategoryInfo } from '@/lib/categories';
import { FaExternalLinkAlt, FaEdit, FaTrash, FaLock, FaUser, FaHeart, FaRegHeart, FaCalendar } from 'react-icons/fa';

export default function AppDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();
  const [app, setApp] = useState<AIApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    loadApp();
  }, [params.id]);

  const loadApp = async () => {
    setLoading(true);
    try {
      const data = await getAppById(params.id as string);
      setApp(data);
      if (data) {
        setIsLiked(user ? data.likes.includes(user.uid) : false);
        setLikeCount(data.likeCount);
      }
    } catch (error) {
      console.error('Error loading app:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user || !app || isLiking) return;

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
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!app || !user) return;

    if (!confirm('정말 이 앱을 삭제하시겠습니까?')) {
      return;
    }

    setDeleting(true);
    try {
      await deleteApp(app.id);
      alert('앱이 삭제되었습니다.');
      router.push('/');
    } catch (error) {
      console.error('Error deleting app:', error);
      alert('앱 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          앱을 찾을 수 없습니다
        </h1>
        <Link href="/" className="text-blue-600 hover:underline">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  const categoryInfo = getCategoryInfo(app.category);
  const CategoryIcon = categoryInfo.icon;
  const isOwner = user?.uid === app.createdBy;

  // 로그인하지 않은 경우
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* 공개 정보 */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md overflow-hidden mb-8 border border-gray-200 dark:border-gray-800">
            <div className="relative w-full h-64 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
              {app.thumbnailUrl && !imageError ? (
                <Image
                  src={app.thumbnailUrl}
                  alt={app.name}
                  fill
                  className="object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${categoryInfo.color}`}>
                  <CategoryIcon className="text-white text-8xl" />
                </div>
              )}
            </div>

            <div className="p-8">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                  {app.name}
                </h1>
                <span className={`px-4 py-2 rounded-full text-white ${categoryInfo.color}`}>
                  {categoryInfo.label}
                </span>
              </div>

              <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
                {app.description}
              </p>

              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <FaUser className="text-purple-500" />
                    <span>{app.createdByName}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                    <FaCalendar className="text-blue-500" />
                    <span>{new Date(app.createdAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-red-500 text-lg">
                  <FaHeart />
                  <span className="font-semibold">{likeCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 로그인 필요 안내 */}
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-200 dark:border-yellow-700 rounded-lg p-8 text-center">
            <FaLock className="text-yellow-600 dark:text-yellow-500 text-4xl mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
              로그인이 필요합니다
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              앱의 상세 정보와 URL을 확인하려면 Google 계정으로 로그인해주세요.
            </p>
            <button
              onClick={signInWithGoogle}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Google 로그인
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 로그인한 경우 - 전체 정보 표시
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="relative w-full h-64 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
            {app.thumbnailUrl && !imageError ? (
              <Image
                src={app.thumbnailUrl}
                alt={app.name}
                fill
                className="object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${categoryInfo.color}`}>
                <CategoryIcon className="text-white text-8xl" />
              </div>
            )}
          </div>

          <div className="p-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                {app.name}
              </h1>
              <span className={`px-4 py-2 rounded-full text-white ${categoryInfo.color}`}>
                {categoryInfo.label}
              </span>
            </div>

            <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
              {app.description}
            </p>

            {/* 메타 정보 */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <FaUser className="text-purple-500" />
                  <span>{app.createdByName}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  <FaCalendar className="text-blue-500" />
                  <span>{new Date(app.createdAt).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>
              <button
                onClick={handleLike}
                disabled={isLiking}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  isLiked
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                } ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLiked ? <FaHeart /> : <FaRegHeart />}
                <span className="font-semibold">{likeCount}</span>
              </button>
            </div>

            {/* 앱 URL */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                앱 URL
              </h2>
              <a
                href={app.appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center space-x-2"
              >
                <span className="break-all">{app.appUrl}</span>
                <FaExternalLinkAlt className="flex-shrink-0" />
              </a>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-800">
              <div></div>

              {isOwner && (
                <div className="flex space-x-3">
                  <Link
                    href={`/apps/${app.id}/edit`}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    <FaEdit />
                    <span>수정</span>
                  </Link>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                  >
                    <FaTrash />
                    <span>{deleting ? '삭제 중...' : '삭제'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Link
            href="/"
            className="text-blue-600 hover:underline"
          >
            ← 목록으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
