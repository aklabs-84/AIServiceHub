'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaArrowLeft, FaHome, FaEdit, FaSave, FaTimes, FaSearch, FaUpload, FaTrash } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import type { Collection, AIApp } from '@/types/database';
import AppCard from '@/components/AppCard';
import { getCategoryInfo } from '@/lib/categories';
import { useAppCategories } from '@/lib/useCategories';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/contexts/ToastContext';
import { db, getBrowserClient } from '@/lib/database';

interface Props {
  collection: Collection;
  featuredApps: AIApp[];
}

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // drive.google.com/file/d/{id}/view 또는 /d/{id}/view → thumbnail URL로 변환
  const fileMatch = url.match(/drive\.google\.com\/(?:file\/)?d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch && !url.includes('thumbnail')) {
    return `https://drive.google.com/thumbnail?id=${fileMatch[1]}&sz=w1600`;
  }
  if (url.includes('drive.google.com/thumbnail') && !url.includes('sz=')) {
    return url + '&sz=w1600';
  }
  return url;
}

export default function CollectionDetailClient({ collection, featuredApps }: Props) {
  const router = useRouter();
  const { categories } = useAppCategories();
  const { user, isAdmin } = useAuth();
  const { showSuccess, showError } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [apps, setApps] = useState<Pick<AIApp, 'id' | 'name' | 'createdByName' | 'category'>[]>([]);
  const [appSearch, setAppSearch] = useState('');
  const [uploadingCard, setUploadingCard] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const cardFileRef = useRef<HTMLInputElement>(null);
  const heroFileRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    slug: collection.slug || '',
    subtitle: collection.subtitle || '',
    title: collection.title || '',
    description: collection.description || '',
    cardImageUrl: collection.cardImageUrl || null,
    heroImageUrl: collection.heroImageUrl || null,
    editorialContent: collection.editorialContent || '',
    appIds: collection.appIds || [],
    isPublished: collection.isPublished ?? true,
    sortOrder: collection.sortOrder || 0,
  });

  useEffect(() => {
    if (isEditing && apps.length === 0) {
      const loadApps = async () => {
        try {
          const supabase = getBrowserClient();
          const data = await db.apps.getAppsForSelection(supabase);
          setApps(data);
        } catch (e) {
          console.error(e);
        }
      };
      loadApps();
    }
  }, [isEditing, apps.length]);

  const filteredApps = apps.filter((app) => {
    const q = appSearch.toLowerCase();
    return app.name.toLowerCase().includes(q);
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const supabase = getBrowserClient();
      await db.collections.update(supabase, {
        id: collection.id,
        slug: formData.slug.trim().toLowerCase().replace(/\s+/g, '-'),
        subtitle: formData.subtitle?.trim() || undefined,
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined,
        cardImageUrl: formData.cardImageUrl?.trim() || undefined,
        heroImageUrl: formData.heroImageUrl?.trim() || undefined,
        editorialContent: formData.editorialContent?.trim() || undefined,
        appIds: formData.appIds,
        isPublished: formData.isPublished,
        sortOrder: formData.sortOrder,
      });
      showSuccess('컬렉션이 수정되었습니다!');
      setIsEditing(false);

      const finalSlug = formData.slug.trim().toLowerCase().replace(/\s+/g, '-');
      const newPath = `/apps/collections/${finalSlug}`;

      // Force immediate navigation or reload to clear cache
      if (finalSlug !== collection.slug) {
        window.location.href = `${newPath}?updated=${Date.now()}`;
      } else {
        window.location.href = `${window.location.pathname}?updated=${Date.now()}`;
      }
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
      await db.collections.remove(supabase, collection.id);
      showSuccess('컬렉션이 삭제되었습니다.');
      router.push('/apps');
    } catch (err) {
      console.error(err);
      showError('삭제 중 오류가 발생했습니다.');
      setDeleting(false);
    }
  };

  const markdownComponents: Components = {
    h1: (props) => <h1 className="text-3xl font-bold mt-6 mb-4 text-gray-900 dark:text-gray-100" {...props} />,
    h2: (props) => <h2 className="text-2xl font-semibold mt-5 mb-3 text-gray-900 dark:text-gray-100" {...props} />,
    h3: (props) => <h3 className="text-xl font-semibold mt-4 mb-2 text-gray-900 dark:text-gray-100" {...props} />,
    p: (props) => <p className="leading-relaxed mb-4 last:mb-0" {...props} />,
    ul: (props) => <ul className="list-disc list-outside pl-5 space-y-2 mb-4" {...props} />,
    ol: (props) => <ol className="list-decimal list-outside pl-5 space-y-2 mb-4" {...props} />,
    li: (props) => <li className="leading-relaxed" {...props} />,
    strong: (props) => <strong className="font-bold text-gray-900 dark:text-white" {...props} />,
    em: (props) => <em className="italic" {...props} />,
    blockquote: (props) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-700 pl-4 py-1 italic text-gray-600 dark:text-gray-400 mb-4" {...props} />,
    a: ({ href, children, ...props }) => {
      if (!href) return <a {...props}>{children}</a>;
      if (href.startsWith('http')) {
        return (
          <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props}>
            {children}
          </a>
        );
      }
      return (
        <Link href={href} className="text-blue-600 dark:text-blue-400 hover:underline" {...props}>
          {children}
        </Link>
      );
    },
    code: ({ inline, className, children, ...props }: any) => {
      if (inline) {
        return (
          <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm font-mono" {...props}>
            {children}
          </code>
        );
      }
      return (
        <pre className="overflow-x-auto rounded-xl bg-gray-900 text-gray-100 text-sm p-4 mb-4 font-mono">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      );
    },
    img: ({ src, alt, ...props }) => {
      // More aggressive check for markdown images
      if (!src || typeof src !== 'string' || src.trim() === '') return null;
      return <img src={src} alt={alt} {...props} className="rounded-2xl shadow-lg max-w-full h-auto mx-auto my-8 border border-gray-100 dark:border-gray-800" />;
    },
  };

  if (isEditing) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
        {/* 브레드크럼 & 툴바 */}
        <div className="sticky top-0 z-30 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
          <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <button onClick={() => setIsEditing(false)} className="hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                취소
              </button>
              <span className="text-gray-300 dark:text-gray-700">/</span>
              <span className="font-semibold text-gray-900 dark:text-white">컬렉션 인라인 수정 모드</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition"
              >
                <FaTrash className="text-xs" />
                {deleting ? '삭제 중...' : '삭제'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
              >
                <FaSave className="text-xs" />
                {submitting ? '저장 중...' : '저장 완료'}
              </button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 py-8 max-w-screen-xl">
          <div className="lg:grid lg:grid-cols-5 lg:gap-12 space-y-8 lg:space-y-0">
            {/* 좌측 패널 (디자인, 메타) */}
            <div className="lg:col-span-2 flex flex-col gap-6">

              <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                  히어로 이미지
                </label>
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
                <div className="flex items-center gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => heroFileRef.current?.click()}
                    disabled={uploadingHero}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition flex-none"
                  >
                    <FaUpload className="text-xs" />
                    {uploadingHero ? '업로드 중...' : '설정'}
                  </button>
                  <input
                    type="url"
                    value={formData.heroImageUrl || ''}
                    onChange={(e) => setFormData({ ...formData, heroImageUrl: e.target.value })}
                    placeholder="URL 직접 입력"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {(() => {
                  const resolved = resolveImageUrl(formData.heroImageUrl);
                  return (resolved && resolved.trim() !== '') ? (
                    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100">
                      <Image
                        src={resolved}
                        alt="히어로"
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 40vw"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, heroImageUrl: null }))}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 hover:opacity-100 transition"
                      >
                        <FaTimes className="text-2xl" />
                      </button>
                    </div>
                  ) : null;
                })()}
              </div>

              <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                  카드 이미지 (목록용)
                </label>
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
                <div className="flex items-center gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => cardFileRef.current?.click()}
                    disabled={uploadingCard}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition flex-none"
                  >
                    <FaUpload className="text-xs" />
                    {uploadingCard ? '업로드...' : '설정'}
                  </button>
                  <input
                    type="url"
                    value={formData.cardImageUrl || ''}
                    onChange={(e) => setFormData({ ...formData, cardImageUrl: e.target.value })}
                    placeholder="URL 직접 입력"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {(() => {
                  const resolved = resolveImageUrl(formData.cardImageUrl);
                  return (resolved && resolved.trim() !== '') ? (
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100">
                      <Image
                        src={resolved}
                        alt="카드"
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, cardImageUrl: null }))}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 hover:opacity-100 transition"
                      >
                        <FaTimes className="text-lg" />
                      </button>
                    </div>
                  ) : null;
                })()}
              </div>

              <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">슬러그 (URL 이름)</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">정렬 순서</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">공개 상태</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isPublished: true })}
                      className={`flex-1 py-1.5 text-sm font-medium rounded-lg border ${formData.isPublished ? 'bg-blue-600 border-blue-600 text-white' : 'bg-transparent border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}
                    >
                      공개
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isPublished: false })}
                      className={`flex-1 py-1.5 text-sm font-medium rounded-lg border ${!formData.isPublished ? 'bg-blue-600 border-blue-600 text-white' : 'bg-transparent border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}
                    >
                      비공개
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 우측 패널 (텍스트, 문서, 앱) */}
            <div className="lg:col-span-3 flex flex-col gap-6">
              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">소제목</label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    placeholder="컬렉션을 꾸며줄 부가 제목"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">제목</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full text-xl font-bold px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">설명 (목록 카드 요약용)</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">상세 마크다운 본문 (에디토리얼)</label>
                  <textarea
                    rows={15}
                    value={formData.editorialContent}
                    onChange={(e) => setFormData({ ...formData, editorialContent: e.target.value })}
                    placeholder="이 컬렉션에 대한 상세한 내용을 마크다운으로 작성하세요."
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 font-mono text-sm leading-relaxed resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                  포함할 앱 관리 ({formData.appIds.length}개)
                </label>
                <div className="relative mb-3">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                  <input
                    type="text"
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                    placeholder="앱 이름으로 검색하여 체크"
                    className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* 선택된 앱 목록 표시 */}
                {formData.appIds.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-1.5 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800">
                    {formData.appIds.map((appId) => {
                      const app = apps.find((a) => a.id === appId) || featuredApps.find((a) => a.id === appId);
                      if (!app) return null;
                      return (
                        <div key={appId} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                          {app.name}
                          <button type="button" onClick={() => toggleApp(appId)} className="hover:text-blue-900 ml-0.5"><FaTimes /></button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-950">
                  {filteredApps.map((app) => {
                    const selected = formData.appIds.includes(app.id);
                    return (
                      <label
                        key={app.id}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition ${selected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleApp(app.id)}
                          className="accent-blue-600 w-4 h-4"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{app.name}</div>
                          <div className="text-xs text-gray-500 truncate">{app.createdByName} · {app.category}</div>
                        </div>
                      </label>
                    );
                  })}
                  {apps.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                      앱 목록을 조립 중이거나, 로딩 중입니다...
                    </div>
                  )}
                  {apps.length > 0 && filteredApps.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                      검색 결과가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // == 일반 VIEW 모드 ==
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* 브레드크럼 */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link href="/" className="hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
              <FaHome className="text-xs" />
            </Link>
            <span className="text-gray-300 dark:text-gray-700">/</span>
            <Link href="/apps/collections" className="hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
              컬렉션
            </Link>
            <span className="text-gray-300 dark:text-gray-700">/</span>
            <span className="font-semibold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 rounded truncate max-w-48 text-xs">{collection.slug}</span>
          </div>
          {isAdmin && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
            >
              <FaEdit className="text-xs" />
              에디터 모드
            </button>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-screen-xl">
        <div className="lg:grid lg:grid-cols-5 lg:gap-12">
          {/* 좌측: 히어로 이미지 + 앱 목록 (sticky) */}
          <div className="lg:col-span-2 lg:sticky lg:top-20 lg:self-start">
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 mb-6 shadow-2xl">
              {(() => {
                const rawUrl = collection.heroImageUrl;
                const resolved = resolveImageUrl(rawUrl);
                const isValid = !!(resolved && typeof resolved === 'string' && resolved.trim() !== '');
                return isValid ? (
                  <Image
                    src={resolved as string}
                    alt={collection.title}
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-8 text-center bg-gray-900">
                    <div className="text-4xl font-black mb-4 leading-tight opacity-50">{collection.title}</div>
                  </div>
                );
              })()}

              {/* 소제목 + 제목 오버레이 */}
              <div className="absolute inset-x-0 top-0 p-6 bg-gradient-to-b from-black/60 to-transparent">
                {collection.subtitle && (
                  <p className="text-white/80 text-xs font-bold tracking-wider mb-1.5 uppercase drop-shadow">{collection.subtitle}</p>
                )}
                <h1 className="text-white text-2xl font-black leading-tight drop-shadow-md">{collection.title}</h1>
              </div>
            </div>
          </div>

          {/* 우측: 에디토리얼 본문 */}
          <div className="lg:col-span-3 mt-8 lg:mt-0">
            {/* 제목 영역 */}
            <div className="mb-8">
              {collection.subtitle && (
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">{collection.subtitle}</p>
              )}
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white leading-tight mb-4">
                {collection.title}
              </h2>
              {collection.description && (
                <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg leading-relaxed mb-6">
                  {collection.description}
                </p>
              )}
            </div>

            {/* 본문 내용 */}
            {collection.editorialContent && (
              <div className="prose prose-slate dark:prose-invert max-w-none text-[1.05rem] text-gray-700 dark:text-gray-300 leading-relaxed mb-12 border-t border-gray-100 dark:border-gray-800 pt-8">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {collection.editorialContent}
                </ReactMarkdown>
              </div>
            )}

            {/* 전체 앱 목록 */}
            {featuredApps.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-800 pt-8">
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6">
                  이 컬렉션에 포함된 앱 ({featuredApps.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {featuredApps.map((app) => (
                    <AppCard
                      key={app.id}
                      app={app}
                      categoryInfo={getCategoryInfo(app.category, categories)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
