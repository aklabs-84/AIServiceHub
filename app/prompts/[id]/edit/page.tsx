'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getPromptById, updatePrompt } from '@/lib/db';
import { Prompt } from '@/types/prompt';
import { promptCategories } from '@/lib/promptCategories';
import { FaSave, FaFeatherAlt } from 'react-icons/fa';

export default function EditPromptPage() {
  const params = useParams();
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    promptContent: '',
    snsUrls: '',
    category: 'daily' as Prompt['category'],
    thumbnailUrl: '',
    createdByName: '',
  });

  useEffect(() => {
    loadPrompt();
  }, [params.id, user]);

  const loadPrompt = async () => {
    setLoading(true);
    try {
      const data = await getPromptById(params.id as string);
      setPrompt(data);
      if (data) {
        setFormData({
          name: data.name,
          description: data.description,
          promptContent: data.promptContent,
          snsUrls: (data.snsUrls || []).join('\n'),
          category: data.category,
          thumbnailUrl: data.thumbnailUrl || '',
          createdByName: data.createdByName || '',
        });
      }
    } catch (error) {
      console.error('Error loading prompt:', error);
    } finally {
      setLoading(false);
    }
  };

  const normalizeUrls = (value: string) =>
    value
      .split(/[\n,]/)
      .map((v) => v.trim())
      .filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !prompt) {
      alert('로그인이 필요하거나, 프롬프트를 찾을 수 없습니다.');
      return;
    }
    if (prompt.createdBy !== user.uid) {
      alert('작성자만 수정할 수 있습니다.');
      return;
    }

    setSubmitting(true);
    try {
      await updatePrompt({
        id: prompt.id,
        name: formData.name,
        description: formData.description,
        promptContent: formData.promptContent,
        snsUrls: normalizeUrls(formData.snsUrls),
        category: formData.category,
        thumbnailUrl: formData.thumbnailUrl || undefined,
        createdByName: formData.createdByName || user.displayName || '익명',
      });
      alert('프롬프트가 수정되었습니다.');
      router.push(`/prompts/${prompt.id}`);
    } catch (error) {
      console.error('Error updating prompt:', error);
      alert('수정 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">로그인이 필요합니다</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">프롬프트를 수정하려면 Google 계정으로 로그인해주세요.</p>
        <button
          onClick={signInWithGoogle}
          className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition"
        >
          Google 로그인
        </button>
      </div>
    );
  }

  if (loading || !prompt) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (prompt.createdBy !== user.uid) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">권한이 없습니다</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">작성자만 수정할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
            <FaFeatherAlt className="text-white text-xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">프롬프트 수정</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">내용을 수정한 뒤 저장하세요.</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-800 space-y-6"
        >
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              프롬프트 제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="프롬프트 제목"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              소개 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="소개를 입력하세요 (마크다운 지원)"
            />
          </div>

          <div>
            <label htmlFor="promptContent" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              프롬프트 내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="promptContent"
              required
              rows={8}
              value={formData.promptContent}
              onChange={(e) => setFormData({ ...formData, promptContent: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="실제 사용할 프롬프트 문구를 입력하세요 (마크다운 지원)"
            />
          </div>

          <div>
            <label htmlFor="snsUrls" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              SNS/채널 링크 (복수 입력 가능)
            </label>
            <textarea
              id="snsUrls"
              rows={3}
              value={formData.snsUrls}
              onChange={(e) => setFormData({ ...formData, snsUrls: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="한 줄에 하나씩 입력하거나 콤마로 구분해서 입력하세요"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">예: YouTube 소개 영상, 블로그 포스트 등</p>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              카테고리 <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as Prompt['category'] })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {promptCategories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="createdByName" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              작성자 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="createdByName"
              required
              value={formData.createdByName}
              onChange={(e) => setFormData({ ...formData, createdByName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="닉네임 또는 이름을 입력하세요"
            />
          </div>

          <div>
            <label htmlFor="thumbnailUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              썸네일 이미지 URL (선택)
            </label>
            <input
              type="url"
              id="thumbnailUrl"
              value={formData.thumbnailUrl}
              onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="https://example.com/image.jpg"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">입력하지 않으면 카테고리 아이콘이 표시됩니다.</p>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white px-6 py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50"
            >
              <FaSave />
              <span>{submitting ? '저장 중...' : '저장하기'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
