'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createApp } from '@/lib/db';
import { AppCategory } from '@/types/app';
import { useAppCategories } from '@/lib/useCategories';
import { FaSave } from 'react-icons/fa';
import { sendSlackNotification } from '@/lib/notifications';

const detectUrls = (value: string) =>
  value
    .split(/[\n,]/)
    .map((v) => v.trim())
    .filter(Boolean);

export default function NewAppPage() {
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const { categories } = useAppCategories();
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    appUrl: '',
    category: 'chatbot' as AppCategory,
    thumbnailUrl: '',
    thumbnailPositionX: 50,
    thumbnailPositionY: 50,
    createdByName: user?.displayName || '',
  });
  const [snsForm, setSnsForm] = useState({
    blog: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    etc: '',
  });
  const [isDragging, setIsDragging] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    if (categories.length === 0) return;
    if (!categories.find((cat) => cat.value === formData.category)) {
      setFormData((prev) => ({ ...prev, category: categories[0].value as AppCategory }));
    }
  }, [categories, formData.category]);

  useEffect(() => {
    if (!formData.thumbnailUrl.trim()) {
      setPreviewError(false);
      return;
    }
    setPreviewError(false);
  }, [formData.thumbnailUrl]);

  const buildSnsUrls = () => {
    const urls: string[] = [];
    const push = (label: string, url: string) => {
      const trimmed = url.trim();
      if (trimmed) urls.push(`${label}: ${trimmed}`);
    };
    push('네이버 블로그', snsForm.blog);
    push('인스타그램', snsForm.instagram);
    push('틱톡', snsForm.tiktok);
    push('유튜브', snsForm.youtube);
    detectUrls(snsForm.etc).forEach((entry) => {
      urls.push(entry.includes(':') ? entry : `링크: ${entry}`);
    });
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    setSubmitting(true);
    try {
      const hasThumbnail = formData.thumbnailUrl.trim().length > 0;
      const appId = await createApp(
        {
          name: formData.name,
          description: formData.description,
          appUrl: formData.appUrl,
          snsUrls: buildSnsUrls(),
          category: formData.category,
          thumbnailUrl: hasThumbnail ? formData.thumbnailUrl : undefined,
          thumbnailPositionX: hasThumbnail ? formData.thumbnailPositionX : undefined,
          thumbnailPositionY: hasThumbnail ? formData.thumbnailPositionY : undefined,
          createdByName: formData.createdByName || user.displayName || '익명',
        },
        user.uid
      );

      alert('앱이 등록되었습니다!');
      router.push(`/apps/${appId}`);
      sendSlackNotification({
        type: 'app',
        id: appId,
        name: formData.name,
        author: formData.createdByName || user.displayName || '익명',
        url: formData.appUrl,
      });
    } catch (error) {
      console.error('Error creating app:', error);
      alert('앱 등록 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateThumbnailPosition = (clientX: number, clientY: number) => {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nextX = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const nextY = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    setFormData((prev) => ({
      ...prev,
      thumbnailPositionX: Math.round(nextX),
      thumbnailPositionY: Math.round(nextY),
    }));
  };

  const handlePreviewPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!formData.thumbnailUrl.trim()) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    updateThumbnailPosition(event.clientX, event.clientY);
  };

  const handlePreviewPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updateThumbnailPosition(event.clientX, event.clientY);
  };

  const handlePreviewPointerUp = () => {
    setIsDragging(false);
  };

  // 로그인하지 않은 경우
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          로그인이 필요합니다
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          앱을 등록하려면 Google 계정으로 로그인해주세요.
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
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-8">
          새 앱 등록
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-800"
        >
          {/* 앱 이름 */}
          <div className="mb-6">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              앱 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="예: AI 챗봇 어시스턴트"
            />
          </div>

          {/* 설명 */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              설명 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="앱에 대한 설명을 입력하세요"
            />
          </div>

          {/* 앱 URL */}
          <div className="mb-6">
            <label htmlFor="appUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              앱 URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              id="appUrl"
              required
              value={formData.appUrl}
              onChange={(e) => setFormData({ ...formData, appUrl: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://aistudio.google.com/..."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Google AI Studio에서 공유한 앱 URL을 입력하세요
            </p>
          </div>

          {/* SNS/채널 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
              SNS/채널 링크
            </label>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                type="url"
                placeholder="네이버 블로그 URL"
                value={snsForm.blog}
                onChange={(e) => setSnsForm({ ...snsForm, blog: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="url"
                placeholder="인스타그램 URL"
                value={snsForm.instagram}
                onChange={(e) => setSnsForm({ ...snsForm, instagram: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="url"
                placeholder="틱톡 URL"
                value={snsForm.tiktok}
                onChange={(e) => setSnsForm({ ...snsForm, tiktok: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="url"
                placeholder="유튜브 URL"
                value={snsForm.youtube}
                onChange={(e) => setSnsForm({ ...snsForm, youtube: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <textarea
              rows={2}
              placeholder="기타 링크가 있다면 입력하세요 (한 줄에 하나씩)"
              value={snsForm.etc}
              onChange={(e) => setSnsForm({ ...snsForm, etc: e.target.value })}
              className="mt-3 w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              입력한 순서대로 카드/상세 화면에 보여집니다.
            </p>
          </div>

          {/* 카테고리 */}
          <div className="mb-6">
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              카테고리 <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as AppCategory })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* 작성자 이름 */}
          <div className="mb-6">
            <label htmlFor="createdByName" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              작성자 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="createdByName"
              required
              value={formData.createdByName}
              onChange={(e) => setFormData({ ...formData, createdByName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="닉네임 또는 이름을 입력하세요"
            />
          </div>

          {/* 썸네일 URL (선택) */}
          <div className="mb-6">
            <label htmlFor="thumbnailUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              썸네일 이미지 URL (선택)
            </label>
            <input
              type="url"
              id="thumbnailUrl"
              value={formData.thumbnailUrl}
              onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/image.jpg"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              입력하지 않으면 카테고리 아이콘이 표시됩니다
            </p>
          </div>

          {/* 썸네일 위치 조정 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              썸네일 위치 (이미지에서 직접 조정)
            </label>
            <div
              ref={previewRef}
              onPointerDown={handlePreviewPointerDown}
              onPointerMove={handlePreviewPointerMove}
              onPointerUp={handlePreviewPointerUp}
              onPointerLeave={handlePreviewPointerUp}
              className={`relative w-full h-48 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${
                formData.thumbnailUrl.trim()
                  ? 'cursor-crosshair'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}
            >
              {!formData.thumbnailUrl.trim() && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                  썸네일 URL을 입력하면 미리보기가 표시됩니다
                </div>
              )}
              {formData.thumbnailUrl.trim() && !previewError && (
                <>
                  <img
                    src={formData.thumbnailUrl}
                    alt="썸네일 미리보기"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                      objectPosition: `${formData.thumbnailPositionX}% ${formData.thumbnailPositionY}%`,
                    }}
                    onError={() => setPreviewError(true)}
                  />
                  <div className="absolute inset-0 bg-black/10" />
                  <div
                    className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md bg-blue-500/80"
                    style={{
                      left: `${formData.thumbnailPositionX}%`,
                      top: `${formData.thumbnailPositionY}%`,
                    }}
                  />
                </>
              )}
              {formData.thumbnailUrl.trim() && previewError && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                  이미지를 불러올 수 없습니다. URL을 확인해주세요.
                </div>
              )}
            </div>
            <div className="space-y-4 mt-4">
              <div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>좌</span>
                  <span>{formData.thumbnailPositionX}%</span>
                  <span>우</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.thumbnailPositionX}
                  disabled={!formData.thumbnailUrl.trim()}
                  onChange={(e) => setFormData({ ...formData, thumbnailPositionX: Number(e.target.value) })}
                  className="w-full accent-blue-600 disabled:opacity-50"
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>상</span>
                  <span>{formData.thumbnailPositionY}%</span>
                  <span>하</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.thumbnailPositionY}
                  disabled={!formData.thumbnailUrl.trim()}
                  onChange={(e) => setFormData({ ...formData, thumbnailPositionY: Number(e.target.value) })}
                  className="w-full accent-blue-600 disabled:opacity-50"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              썸네일 이미지가 있을 때만 적용됩니다.
            </p>
          </div>

          {/* 제출 버튼 */}
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
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <FaSave />
              <span>{submitting ? '등록 중...' : '등록하기'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
