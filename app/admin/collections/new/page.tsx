'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, getBrowserClient } from '@/lib/database';
import type { AIApp } from '@/types/database';
import { FaSave, FaArrowLeft, FaSearch } from 'react-icons/fa';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

interface CollectionFormData {
  slug: string;
  subtitle: string;
  title: string;
  description: string;
  cardImageUrl: string;
  heroImageUrl: string;
  editorialContent: string;
  appIds: string[];
  isPublished: boolean;
  sortOrder: number;
}

export default function NewCollectionPage() {
  const router = useRouter();
  const { user, isAdmin, loading } = useAuth();
  const { showSuccess, showError } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [apps, setApps] = useState<AIApp[]>([]);
  const [appSearch, setAppSearch] = useState('');
  const [formData, setFormData] = useState<CollectionFormData>({
    slug: '',
    subtitle: '',
    title: '',
    description: '',
    cardImageUrl: '',
    heroImageUrl: '',
    editorialContent: '',
    appIds: [],
    isPublished: true,
    sortOrder: 0,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getBrowserClient();
        const data = await db.apps.getAll(supabase);
        setApps(data);
      } catch (e) {
        console.error(e);
      }
    };
    if (user) load();
  }, [user]);

  const filteredApps = apps.filter((app) => {
    const q = appSearch.toLowerCase();
    return app.name.toLowerCase().includes(q) || app.description.toLowerCase().includes(q);
  });

  const toggleApp = (appId: string) => {
    setFormData((prev) => ({
      ...prev,
      appIds: prev.appIds.includes(appId)
        ? prev.appIds.filter((id) => id !== appId)
        : [...prev.appIds, appId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.slug.trim()) {
      showError('슬러그를 입력해주세요.');
      return;
    }
    if (!formData.title.trim()) {
      showError('제목을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = getBrowserClient();
      const id = await db.collections.create(
        supabase,
        {
          slug: formData.slug.trim().toLowerCase().replace(/\s+/g, '-'),
          subtitle: formData.subtitle.trim() || undefined,
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          cardImageUrl: formData.cardImageUrl.trim() || undefined,
          heroImageUrl: formData.heroImageUrl.trim() || undefined,
          editorialContent: formData.editorialContent.trim() || undefined,
          appIds: formData.appIds,
          isPublished: formData.isPublished,
          sortOrder: formData.sortOrder,
        },
        user.id
      );
      showSuccess('컬렉션이 등록되었습니다!');
      router.push(`/admin/collections/${id}/edit`);
    } catch (err) {
      console.error(err);
      showError('컬렉션 등록 중 오류가 발생했습니다. 슬러그가 중복되었을 수 있습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  if (!user || !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-gray-600 dark:text-gray-400">관리자만 접근할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
        >
          <FaArrowLeft className="text-xs" />
          관리자 대시보드
        </Link>
        <span className="text-gray-300 dark:text-gray-700">/</span>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">새 컬렉션 등록</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">새 컬렉션 등록</h1>
        {formData.slug && (
          <Link
            href={`/apps/collections/${formData.slug}`}
            target="_blank"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            미리보기 →
          </Link>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8">

        {/* 슬러그 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            슬러그 (URL) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="예: productivity-apps-2024"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            URL에 사용됩니다: /apps/collections/<strong>{formData.slug || 'slug'}</strong>
          </p>
        </div>

        {/* 소제목 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            소제목
          </label>
          <input
            type="text"
            value={formData.subtitle}
            onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
            placeholder="예: 모두에게 사랑받는 앱"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 제목 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="예: 업무를 도와주는 7가지 앱"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 카드 설명 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            카드 설명
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="예: 생산성을 높여줄 AI 앱을 모았습니다."
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">앱 목록 페이지 카드에 표시됩니다.</p>
        </div>

        {/* 카드 이미지 URL */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            카드 이미지 URL
          </label>
          <input
            type="url"
            value={formData.cardImageUrl}
            onChange={(e) => setFormData({ ...formData, cardImageUrl: e.target.value })}
            placeholder="https://example.com/card-image.jpg"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">목록 카드 우측에 원형으로 표시됩니다.</p>
        </div>

        {/* 히어로 이미지 URL */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            히어로 이미지 URL
          </label>
          <input
            type="url"
            value={formData.heroImageUrl}
            onChange={(e) => setFormData({ ...formData, heroImageUrl: e.target.value })}
            placeholder="https://example.com/hero-image.jpg"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">상세 페이지 좌측 대형 이미지입니다.</p>
        </div>

        {/* 본문 내용 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            본문 내용
          </label>
          <textarea
            rows={10}
            value={formData.editorialContent}
            onChange={(e) => setFormData({ ...formData, editorialContent: e.target.value })}
            placeholder="상세 페이지에 표시될 본문 내용을 마크다운(Markdown) 형식으로 입력하세요. 줄바꿈 및 스타일이 그대로 반영됩니다."
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y font-mono"
          />
        </div>

        {/* 앱 선택 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            포함할 앱 선택 ({formData.appIds.length}개 선택됨)
          </label>
          <div className="relative mb-3">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <input
              type="text"
              value={appSearch}
              onChange={(e) => setAppSearch(e.target.value)}
              placeholder="앱 이름으로 검색"
              className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
            {filteredApps.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                {apps.length === 0 ? '앱을 불러오는 중...' : '검색 결과가 없습니다.'}
              </div>
            ) : (
              filteredApps.map((app) => {
                const selected = formData.appIds.includes(app.id);
                return (
                  <label
                    key={app.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition ${selected
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleApp(app.id)}
                      className="accent-blue-600 w-4 h-4"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {app.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {app.createdByName} · {app.category}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
          {formData.appIds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {formData.appIds.map((id) => {
                const app = apps.find((a) => a.id === id);
                if (!app) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold"
                  >
                    {app.name}
                    <button type="button" onClick={() => toggleApp(id)} className="hover:text-blue-900">×</button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* 정렬 순서 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            정렬 순서
          </label>
          <input
            type="number"
            value={formData.sortOrder}
            onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
            className="w-32 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">숫자가 작을수록 먼저 표시됩니다.</p>
        </div>

        {/* 공개 설정 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            공개 설정
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isPublished: true })}
              className={`px-5 py-2 rounded-lg border text-sm font-semibold transition ${formData.isPublished
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
            >
              공개
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isPublished: false })}
              className={`px-5 py-2 rounded-lg border text-sm font-semibold transition ${!formData.isPublished
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
            >
              비공개
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">비공개 상태에서는 앱 목록에 노출되지 않습니다.</p>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Link
            href="/admin"
            className="px-5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <FaSave />
            {submitting ? '등록 중...' : '등록하기'}
          </button>
        </div>
      </form>
    </div>
  );
}
