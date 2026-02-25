'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, getBrowserClient } from '@/lib/database';
import type { AIApp, Collection } from '@/types/database';
import { FaSave, FaArrowLeft, FaTrash, FaSearch, FaUpload, FaTimes } from 'react-icons/fa';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';
import Image from 'next/image';

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

export default function EditCollectionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user, isAdmin, loading } = useAuth();
  const { showSuccess, showError } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [apps, setApps] = useState<AIApp[]>([]);
  const [appSearch, setAppSearch] = useState('');
  const [uploadingCard, setUploadingCard] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const cardFileRef = useRef<HTMLInputElement>(null);
  const heroFileRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<CollectionFormData>({
    slug: '',
    subtitle: '',
    title: '',
    description: '',
    cardImageUrl: '',
    heroImageUrl: '',
    editorialContent: '',
    appIds: [],
    isPublished: false,
    sortOrder: 0,
  });

  useEffect(() => {
    if (!user || !id) return;
    const load = async () => {
      setLoadingData(true);
      try {
        const supabase = getBrowserClient();
        const [collection, appsData] = await Promise.all([
          db.collections.getById(supabase, id),
          db.apps.getAll(supabase),
        ]);
        if (!collection) {
          showError('컬렉션을 찾을 수 없습니다.');
          router.push('/admin');
          return;
        }
        setApps(appsData);
        setFormData({
          slug: collection.slug,
          subtitle: collection.subtitle,
          title: collection.title,
          description: collection.description,
          cardImageUrl: collection.cardImageUrl || '',
          heroImageUrl: collection.heroImageUrl || '',
          editorialContent: collection.editorialContent,
          appIds: collection.appIds,
          isPublished: collection.isPublished,
          sortOrder: collection.sortOrder,
        });
      } catch (e) {
        console.error(e);
        showError('데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, [user, id]);

  const filteredApps = apps.filter((app) => {
    const q = appSearch.toLowerCase();
    return app.name.toLowerCase().includes(q) || app.description.toLowerCase().includes(q);
  });

  const toggleApp = (appId: string) => {
    setFormData((prev) => ({
      ...prev,
      appIds: prev.appIds.includes(appId)
        ? prev.appIds.filter((aid) => aid !== appId)
        : [...prev.appIds, appId],
    }));
  };

  const handleImageUpload = async (
    file: File,
    field: 'cardImageUrl' | 'heroImageUrl',
    setUploading: (v: boolean) => void
  ) => {
    setUploading(true);
    try {
      const supabase = getBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { showError('로그인이 필요합니다.'); return; }

      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/collections/upload-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) { showError(json.error || '업로드 실패'); return; }
      setFormData((prev) => ({ ...prev, [field]: json.url }));
    } catch {
      showError('업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const supabase = getBrowserClient();
      await db.collections.update(supabase, {
        id,
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
      });
      showSuccess('컬렉션이 수정되었습니다!');
    } catch (err) {
      console.error(err);
      showError('수정 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('이 컬렉션을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    setDeleting(true);
    try {
      const supabase = getBrowserClient();
      await db.collections.remove(supabase, id);
      showSuccess('컬렉션이 삭제되었습니다.');
      router.push('/admin');
    } catch (err) {
      console.error(err);
      showError('삭제 중 오류가 발생했습니다.');
      setDeleting(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

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
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">컬렉션 수정</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">컬렉션 수정</h1>
        <div className="flex items-center gap-2">
          {formData.slug && (
            <Link
              href={`/apps/collections/${formData.slug}`}
              target="_blank"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              미리보기 →
            </Link>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition"
          >
            <FaTrash className="text-xs" />
            {deleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
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
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            /apps/collections/<strong>{formData.slug || 'slug'}</strong>
          </p>
        </div>

        {/* 소제목 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">소제목</label>
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
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 카드 설명 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">카드 설명</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 카드 이미지 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">카드 이미지</label>
          <input
            ref={cardFileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file, 'cardImageUrl', setUploadingCard);
              e.target.value = '';
            }}
          />
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => cardFileRef.current?.click()}
              disabled={uploadingCard}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition flex-none"
            >
              <FaUpload className="text-xs" />
              {uploadingCard ? '업로드 중...' : '파일 선택'}
            </button>
            <input
              type="url"
              value={formData.cardImageUrl}
              onChange={(e) => setFormData({ ...formData, cardImageUrl: e.target.value })}
              placeholder="또는 이미지 URL 직접 입력"
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {formData.cardImageUrl && (
              <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex-none">
                <Image src={formData.cardImageUrl} alt="카드 미리보기" fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, cardImageUrl: '' }))}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 hover:opacity-100 transition text-[10px]"
                >
                  <FaTimes />
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">JPG·PNG·WEBP, 5MB 이하. 목록 카드에 표시됩니다.</p>
        </div>

        {/* 히어로 이미지 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">히어로 이미지</label>
          <input
            ref={heroFileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file, 'heroImageUrl', setUploadingHero);
              e.target.value = '';
            }}
          />
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => heroFileRef.current?.click()}
              disabled={uploadingHero}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition flex-none"
            >
              <FaUpload className="text-xs" />
              {uploadingHero ? '업로드 중...' : '파일 선택'}
            </button>
            <input
              type="url"
              value={formData.heroImageUrl}
              onChange={(e) => setFormData({ ...formData, heroImageUrl: e.target.value })}
              placeholder="또는 이미지 URL 직접 입력"
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {formData.heroImageUrl && (
              <div className="relative w-10 h-14 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex-none">
                <Image src={formData.heroImageUrl} alt="히어로 미리보기" fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, heroImageUrl: '' }))}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 hover:opacity-100 transition text-[10px]"
                >
                  <FaTimes />
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">JPG·PNG·WEBP, 5MB 이하. 상세 페이지 좌측 대형 이미지입니다.</p>
        </div>

        {/* 본문 내용 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">본문 내용</label>
          <textarea
            rows={12}
            value={formData.editorialContent}
            onChange={(e) => setFormData({ ...formData, editorialContent: e.target.value })}
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
            {filteredApps.map((app) => {
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
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{app.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{app.createdByName} · {app.category}</div>
                  </div>
                </label>
              );
            })}
          </div>
          {formData.appIds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {formData.appIds.map((appId) => {
                const app = apps.find((a) => a.id === appId);
                if (!app) return null;
                return (
                  <span
                    key={appId}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold"
                  >
                    {app.name}
                    <button type="button" onClick={() => toggleApp(appId)} className="hover:text-blue-900">×</button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* 정렬 순서 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">정렬 순서</label>
          <input
            type="number"
            value={formData.sortOrder}
            onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
            className="w-32 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 공개 설정 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">공개 설정</label>
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
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Link
            href="/admin"
            className="px-5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            목록으로
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <FaSave />
            {submitting ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </form>
    </div>
  );
}
