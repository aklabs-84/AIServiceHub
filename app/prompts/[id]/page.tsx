'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getPromptById } from '@/lib/db';
import { Prompt } from '@/types/prompt';
import { getPromptCategoryInfo } from '@/lib/promptCategories';
import { useAuth } from '@/contexts/AuthContext';
import { FaCalendar, FaExternalLinkAlt, FaFeatherAlt, FaLink, FaUser, FaLock, FaEdit, FaTrash } from 'react-icons/fa';
import { deletePrompt } from '@/lib/db';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function PromptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // user가 준비된 뒤에만 로드 (비로그인 상태에선 호출 안 함)
    if (user) {
      loadPrompt();
    } else if (authChecked) {
      setLoading(false);
    }
  }, [params.id, user, authChecked]);

  useEffect(() => {
    // auth context가 초기화되면 플래그 설정
    setAuthChecked(true);
  }, [user]);

  const loadPrompt = async () => {
    setLoading(true);
    try {
      const data = await getPromptById(params.id as string);
      setPrompt(data);
    } catch (error) {
      console.error('Error loading prompt:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          로그인이 필요합니다
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          프롬프트 본문과 링크는 로그인한 사용자만 볼 수 있습니다.
        </p>
        <button
          onClick={signInWithGoogle}
          className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white px-6 py-3 rounded-lg hover:opacity-90 transition"
        >
          Google 로그인
        </button>
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          프롬프트를 찾을 수 없습니다
        </h1>
        <Link href="/prompts" className="text-emerald-600 hover:underline">
          프롬프트 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const categoryInfo = getPromptCategoryInfo(prompt.category);
  const CategoryIcon = categoryInfo.icon;
  const isOwner = user?.uid === prompt.createdBy;
  const parsedSns = prompt.snsUrls.map((entry) => {
    const parts = entry.split(':');
    if (parts.length >= 2) {
      const label = parts.shift()?.trim() || '';
      const url = parts.join(':').trim();
      return { label, url };
    }
    return { label: '', url: entry };
  });

  const handleDelete = async () => {
    if (!prompt || !isOwner) return;
    if (!confirm('정말 이 프롬프트를 삭제하시겠습니까?')) return;
    setDeleting(true);
    try {
      await deletePrompt(prompt.id);
      alert('프롬프트가 삭제되었습니다.');
      router.push('/prompts');
    } catch (error) {
      console.error('Error deleting prompt:', error);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="relative w-full h-64 bg-gradient-to-br from-emerald-200 to-blue-200 dark:from-emerald-900/30 dark:to-blue-900/20">
            {prompt.thumbnailUrl && !imageError ? (
              <Image
                src={prompt.thumbnailUrl}
                alt={prompt.name}
                fill
                className="object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <CategoryIcon className="text-white text-7xl drop-shadow-lg" />
              </div>
            )}
            <div className="absolute top-4 right-4">
              <span className="px-4 py-2 rounded-full bg-white/80 dark:bg-gray-900/80 text-gray-800 dark:text-gray-100 text-sm font-semibold shadow">
                {categoryInfo.label}
              </span>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white">
                    <FaFeatherAlt />
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <FaUser className="text-emerald-500" />
                      <span>{prompt.createdByName}</span>
                    </div>
                    <span className="text-gray-300 dark:text-gray-700">•</span>
                    <div className="flex items-center space-x-2">
                      <FaCalendar className="text-emerald-400" />
                      <span>{new Date(prompt.createdAt).toLocaleDateString('ko-KR')}</span>
                    </div>
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                  {prompt.name}
                </h1>
              </div>
            </div>

            <div className="prose prose-emerald dark:prose-invert max-w-none text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{prompt.description}</ReactMarkdown>
            </div>

            {!user ? (
              <div className="p-6 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                  <FaLock />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">로그인 후 프롬프트와 링크를 볼 수 있습니다</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">가입자 전용 정보입니다. 로그인하면 전체 프롬프트와 SNS 링크가 공개됩니다.</p>
                </div>
                <button
                  onClick={signInWithGoogle}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold shadow hover:opacity-90 transition"
                >
                  Google 로그인
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                  <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-100 mb-2 flex items-center space-x-2">
                    <FaLink />
                    <span>프롬프트 본문</span>
                  </h2>
                  <div className="prose prose-emerald dark:prose-invert max-w-none text-sm leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{prompt.promptContent}</ReactMarkdown>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center space-x-2">
                    <FaExternalLinkAlt />
                    <span>SNS / 채널</span>
                  </h2>
                  {parsedSns.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">등록된 SNS 링크가 없습니다.</p>
                  ) : (
                    <ul className="space-y-2">
                      {parsedSns.map((item, idx) => (
                        <li key={idx}>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-300 hover:underline break-all"
                          >
                            {item.label ? `${item.label}: ` : ''}
                            {item.url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <div className="flex gap-2">
                {isOwner && (
                  <>
                    <button
                      onClick={() => router.push(`/prompts/${prompt.id}/edit`)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      <FaEdit />
                      <span>수정</span>
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-60"
                    >
                      <FaTrash />
                      <span>{deleting ? '삭제 중...' : '삭제'}</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => router.push('/prompts')}
                  className="px-5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  목록으로 돌아가기
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
