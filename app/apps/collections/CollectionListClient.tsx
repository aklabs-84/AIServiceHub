'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaHome, FaArrowLeft, FaPlus, FaSave, FaTimes, FaSearch, FaUpload } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import type { Collection, AIApp } from '@/types/database';
import { useAppCategories } from '@/lib/useCategories';
import { useToast } from '@/contexts/ToastContext';
import { db, getBrowserClient } from '@/lib/database';

interface Props {
    initialCollections: Collection[];
}

function resolveImageUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    const fileMatch = url.match(/drive\.google\.com\/(?:file\/)?d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch && !url.includes('thumbnail')) {
        return `https://drive.google.com/thumbnail?id=${fileMatch[1]}&sz=w1600`;
    }
    if (url.includes('drive.google.com/thumbnail') && !url.includes('sz=')) {
        return url + '&sz=w1600';
    }
    return url;
}

export default function CollectionListClient({ initialCollections }: Props) {
    const { categories } = useAppCategories();
    const { user, isAdmin } = useAuth();
    const { showSuccess, showError } = useToast();

    const [isAdding, setIsAdding] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [apps, setApps] = useState<Pick<AIApp, 'id' | 'name' | 'createdByName' | 'category'>[]>([]);
    const [appSearch, setAppSearch] = useState('');
    const [uploadingCard, setUploadingCard] = useState(false);
    const [uploadingHero, setUploadingHero] = useState(false);
    const cardFileRef = useRef<HTMLInputElement>(null);
    const heroFileRef = useRef<HTMLInputElement>(null);

    const initialFormData = {
        slug: '',
        subtitle: '',
        title: '',
        description: '',
        cardImageUrl: null as string | null,
        heroImageUrl: null as string | null,
        editorialContent: '',
        appIds: [] as string[],
        isPublished: true,
        sortOrder: 0,
    };

    const [formData, setFormData] = useState(initialFormData);

    useEffect(() => {
        if (isAdding && apps.length === 0) {
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
    }, [isAdding, apps.length]);

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
        if (!formData.title.trim() || !formData.slug.trim()) {
            showError('제목과 슬러그는 필수입니다.');
            return;
        }

        setSubmitting(true);
        try {
            const supabase = getBrowserClient();
            await db.collections.create(supabase, {
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
            }, user.id);

            showSuccess('새 컬렉션이 등록되었습니다!');
            setIsAdding(false);

            const finalSlug = formData.slug.trim().toLowerCase().replace(/\s+/g, '-');
            const newPath = `${window.location.pathname}?updated=${Date.now()}`;
            window.location.href = newPath;
        } catch (err: any) {
            console.error(err);
            showError('등록 중 오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    const displayedCollections = isAdmin
        ? initialCollections
        : initialCollections.filter(c => c.isPublished);

    if (isAdding) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
                {/* 브레드크럼 & 툴바 */}
                <div className="sticky top-0 z-30 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
                    <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <button onClick={() => setIsAdding(false)} className="hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                                취소
                            </button>
                            <span className="text-gray-300 dark:text-gray-700">/</span>
                            <span className="font-semibold text-gray-900 dark:text-white">새 컬렉션 등록 모드</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="inline-flex items-center gap-2 px-6 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-lg shadow-blue-500/20"
                            >
                                <FaSave className="text-xs" />
                                {submitting ? '등록 중...' : '등록하기'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-4 sm:px-6 py-8 max-w-screen-xl">
                    <div className="lg:grid lg:grid-cols-5 lg:gap-12 space-y-8 lg:space-y-0">
                        {/* 좌측 패널 (디자인, 메타) */}
                        <div className="lg:col-span-2 flex flex-col gap-6">
                            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">히어로 이미지</label>
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
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition"
                                    >
                                        <FaUpload className="text-xs" />
                                        {uploadingHero ? '업로드...' : '파일 선택'}
                                    </button>
                                    <input
                                        type="url"
                                        value={formData.heroImageUrl || ''}
                                        onChange={(e) => setFormData({ ...formData, heroImageUrl: e.target.value })}
                                        placeholder="이미지 URL"
                                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                {(() => {
                                    const resolved = resolveImageUrl(formData.heroImageUrl);
                                    return (resolved && resolved.trim() !== '') ? (
                                        <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden shadow-inner bg-gray-100">
                                            <Image
                                                src={resolved}
                                                alt="Preview"
                                                fill
                                                className="object-cover"
                                                sizes="(max-width: 1024px) 100vw, 40vw"
                                            />
                                        </div>
                                    ) : null;
                                })()}
                            </div>

                            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">슬러그 (URL용 고유 이름)</label>
                                <input
                                    type="text"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    placeholder="예: write-tools-2026"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="mt-1.5 text-[10px] text-gray-400">영문, 숫자, 하이픈(-)만 사용하는 것을 권장합니다.</p>
                            </div>

                            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">정렬 순서</label>
                                    <input
                                        type="number"
                                        value={formData.sortOrder}
                                        onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm"
                                    />
                                </div>
                                <div className="flex items-center justify-between p-1">
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">즉시 공개</span>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isPublished: !formData.isPublished })}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.isPublished ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isPublished ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
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
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">제목 (필수)</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="컬렉션의 대표 이름"
                                        className="w-full text-lg font-bold px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">카드 요약 설명</label>
                                    <textarea
                                        rows={2}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="목록 화면에 노출될 간단한 설명"
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 resize-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">상세 에디토리얼 (마크다운)</label>
                                    <textarea
                                        rows={12}
                                        value={formData.editorialContent}
                                        onChange={(e) => setFormData({ ...formData, editorialContent: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 font-mono text-sm leading-relaxed resize-y focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">포함할 앱 ({formData.appIds.length}개)</label>
                                <div className="relative mb-3">
                                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                                    <input
                                        type="text"
                                        value={appSearch}
                                        onChange={(e) => setAppSearch(e.target.value)}
                                        placeholder="앱 이름 검색"
                                        className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950">
                                    {filteredApps.map((app) => (
                                        <label key={app.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition border-b border-gray-50 dark:border-gray-800 last:border-0">
                                            <input
                                                type="checkbox"
                                                checked={formData.appIds.includes(app.id)}
                                                onChange={() => toggleApp(app.id)}
                                                className="accent-blue-600 w-4 h-4"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{app.name}</div>
                                                <div className="text-[10px] text-gray-500 truncate">{app.category}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <div className="sticky top-0 z-20 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
                <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Link href="/" className="hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                            <FaHome className="text-xs" />
                        </Link>
                        <span className="text-gray-300 dark:text-gray-700">/</span>
                        <Link href="/apps" className="hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                            바이브코딩
                        </Link>
                        <span className="text-gray-300 dark:text-gray-700">/</span>
                        <span className="font-semibold text-gray-900 dark:text-white">기획 컬렉션</span>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/20"
                        >
                            <FaPlus className="text-xs" />
                            새 컬렉션 등록
                        </button>
                    )}
                </div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 py-8 max-w-screen-xl">
                <Link
                    href="/apps"
                    className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition mb-6"
                >
                    <FaArrowLeft className="text-xs" />
                    앱 목록으로
                </Link>

                <div className="mb-8">
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">기획 컬렉션</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        엄선된 AI 앱 컬렉션을 살펴보세요.
                    </p>
                </div>

                {displayedCollections.length === 0 ? (
                    <div className="text-center py-24 text-gray-500 dark:text-gray-400">
                        <p className="text-lg font-semibold mb-2">아직 공개된 컬렉션이 없습니다</p>
                        <p className="text-sm">곧 새로운 컬렉션이 추가될 예정입니다.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {displayedCollections.map((col) => (
                            <Link
                                key={col.id}
                                href={`/apps/collections/${col.slug}`}
                                className="group relative h-64 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300"
                            >
                                {(() => {
                                    const rawUrl = col.heroImageUrl || col.cardImageUrl;
                                    const resolved = resolveImageUrl(rawUrl);
                                    const isValid = !!(resolved && typeof resolved === 'string' && resolved.trim() !== '');
                                    return isValid ? (
                                        <Image
                                            src={resolved as string}
                                            alt={col.title}
                                            fill
                                            unoptimized
                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800" />
                                    );
                                })()}

                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                                {col.appIds.length > 0 && (
                                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold">
                                        앱 {col.appIds.length}개
                                    </div>
                                )}

                                <div className="absolute bottom-0 left-0 right-0 p-5">
                                    {col.subtitle && (
                                        <p className="text-white/70 text-[10px] font-bold mb-1 uppercase tracking-tight">{col.subtitle}</p>
                                    )}
                                    <h2 className="text-white font-black text-lg leading-tight line-clamp-2 mb-1">
                                        {col.title}
                                    </h2>
                                    {col.description && (
                                        <p className="text-white/60 text-[11px] line-clamp-1">{col.description}</p>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
