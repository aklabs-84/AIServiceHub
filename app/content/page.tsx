'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { FaSpinner, FaLink, FaUser, FaGlobe, FaInstagram, FaYoutube, FaTiktok, FaBlog, FaFilter } from 'react-icons/fa';
import { getAllApps } from '@/lib/db';
import { AIApp, AppCategory } from '@/types/app';
import { useAuth } from '@/contexts/AuthContext';
import { useOneTimeAccess } from '@/contexts/OneTimeAccessContext';
import { useAppCategories } from '@/lib/useCategories';
import { getCategoryInfo } from '@/lib/categories';

type PlatformKey = 'instagram' | 'youtube' | 'tiktok' | 'twitter' | 'blog' | 'notion' | 'form' | 'other';

interface SnsItem {
  id: string;
  appId: string;
  appName: string;
  createdByName: string;
  appUrl: string;
  category: AppCategory;
  thumbnailUrl?: string;
  thumbnailPositionX?: number;
  thumbnailPositionY?: number;
  label: string;
  url: string;
  platform: PlatformKey;
  hostname: string;
}

const parseUrl = (raw: string) => {
  try {
    return new URL(raw);
  } catch {
    return new URL(`https://${raw}`);
  }
};

const detectPlatform = (url: string): { platform: PlatformKey; hostname: string; icon?: string } => {
  try {
    const parsed = parseUrl(url);
    const hostname = parsed.hostname.replace('www.', '');
    const host = hostname.toLowerCase();
    if (host.includes('instagram.com')) return { platform: 'instagram', hostname, icon: '/instagram-icon.svg' };
    if (host.includes('youtube.com') || host.includes('youtu.be')) return { platform: 'youtube', hostname, icon: '/youtube.svg' };
    if (host.includes('tiktok.com')) return { platform: 'tiktok', hostname };
    if (host.includes('twitter.com') || host === 'x.com') return { platform: 'twitter', hostname };
    if (host.includes('notion.so') || host.includes('notion.site')) return { platform: 'notion', hostname };
    if (host.includes('forms.gle') || host.includes('docs.google.com')) return { platform: 'form', hostname };
    if (host.includes('blog.') || host.includes('naver.com') || host.includes('tistory') || host.includes('medium.com')) {
      return { platform: 'blog', hostname, icon: '/naver-blog.svg' };
    }
    return { platform: 'other', hostname };
  } catch {
    return { platform: 'other', hostname: url };
  }
};

const extractEntry = (entry: string) => {
  const parts = entry.split(':');
  if (parts.length >= 2) {
    const label = parts.shift()?.trim() || '';
    const url = parts.join(':').trim();
    return { label, url };
  }
  return { label: '링크', url: entry.trim() };
};

const normalizeUrl = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    return new URL(trimmed).toString();
  } catch {
    return `https://${trimmed}`;
  }
};

const getThumbnailUrl = (app: AIApp) => {
  if (!app.thumbnailUrl) return '';
  const normalized = normalizeUrl(app.thumbnailUrl);
  if (normalized.startsWith('http')) {
    return `/api/image-proxy?url=${encodeURIComponent(normalized)}`;
  }
  return normalized;
};

const ContentPage = dynamic(() => Promise.resolve(ContentPageInner), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center py-24 text-gray-600 dark:text-gray-300">
      <FaSpinner className="animate-spin text-3xl mb-3" />
      <p>콘텐츠를 불러오는 중...</p>
    </div>
  ),
});

export default ContentPage;

function ContentPageInner() {
  const { user } = useAuth();
  const { isActive: hasOneTimeAccess } = useOneTimeAccess();
  const { categories } = useAppCategories();
  const [apps, setApps] = useState<AIApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<AppCategory | 'all'>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformKey | 'all'>('all');
  const [page, setPage] = useState(1);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const pageSize = 8;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getAllApps();
        setApps(data);
      } catch (error) {
        console.error('Failed to load apps:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const visibleApps = useMemo(() => {
    if (hasOneTimeAccess) return apps;
    const uid = user?.uid;
    return apps.filter((app) => (app.isPublic ?? true) || app.createdBy === uid);
  }, [apps, user?.uid, hasOneTimeAccess]);

  const snsItems = useMemo(() => {
    const items: SnsItem[] = [];
    visibleApps.forEach((app) => {
      const thumbnailUrl = getThumbnailUrl(app) || undefined;
      app.snsUrls.forEach((entry, idx) => {
        const { label, url } = extractEntry(entry);
        if (!url) return;
        const { platform, hostname } = detectPlatform(url);
        items.push({
          id: `${app.id}-${idx}`,
          appId: app.id,
          appName: app.name,
          createdByName: app.createdByName,
          appUrl: app.appUrl,
          category: app.category,
          thumbnailUrl,
          thumbnailPositionX: app.thumbnailPositionX,
          thumbnailPositionY: app.thumbnailPositionY,
          label,
          url,
          platform,
          hostname,
        });
      });
    });
    return items;
  }, [visibleApps]);

  const filteredItems = useMemo(() => {
    let items = snsItems;
    if (selectedCategory !== 'all') {
      items = items.filter((item) => item.category === selectedCategory);
    }
    if (selectedPlatform !== 'all') {
      items = items.filter((item) => item.platform === selectedPlatform);
    }
    return items;
  }, [snsItems, selectedCategory, selectedPlatform]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page]);

  useEffect(() => {
    setPage(1);
  }, [selectedCategory, selectedPlatform]);

  const platformLabel = (platform: PlatformKey) => {
    switch (platform) {
      case 'instagram':
        return 'Instagram';
      case 'youtube':
        return 'YouTube';
      case 'tiktok':
        return 'TikTok';
      case 'twitter':
        return 'X/Twitter';
      case 'blog':
        return 'Blog';
      case 'notion':
        return 'Notion';
      case 'form':
        return 'Form';
      default:
        return 'Link';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-600 dark:text-gray-300">
        <FaSpinner className="animate-spin text-3xl mb-3" />
        <p>콘텐츠를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">콘텐츠</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">SNS 콘텐츠 모아보기</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">앱에 연결된 블로그/유튜브/틱톡/인스타그램 링크를 한눈에 확인하세요.</p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          총 <span className="font-semibold text-gray-900 dark:text-gray-200">{filteredItems.length}</span>개 링크
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
            selectedCategory === 'all'
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent'
              : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          전체
        </button>
        {categories.map((category) => (
          <button
            key={category.value}
            type="button"
            onClick={() => setSelectedCategory(category.value)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
              selectedCategory === category.value
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <FaFilter />
          플랫폼
        </span>
        <button
          type="button"
          onClick={() => setSelectedPlatform('all')}
          className={`px-3 py-2 rounded-full text-xs font-semibold border transition ${
            selectedPlatform === 'all'
              ? 'bg-blue-600 text-white border-transparent'
              : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          전체
        </button>
        <button
          type="button"
          onClick={() => setSelectedPlatform('blog')}
          className={`px-3 py-2 rounded-full text-xs font-semibold border transition flex items-center gap-2 ${
            selectedPlatform === 'blog'
              ? 'bg-blue-600 text-white border-transparent'
              : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <FaBlog />
          블로그
        </button>
        <button
          type="button"
          onClick={() => setSelectedPlatform('youtube')}
          className={`px-3 py-2 rounded-full text-xs font-semibold border transition flex items-center gap-2 ${
            selectedPlatform === 'youtube'
              ? 'bg-blue-600 text-white border-transparent'
              : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <FaYoutube />
          유튜브
        </button>
        <button
          type="button"
          onClick={() => setSelectedPlatform('instagram')}
          className={`px-3 py-2 rounded-full text-xs font-semibold border transition flex items-center gap-2 ${
            selectedPlatform === 'instagram'
              ? 'bg-blue-600 text-white border-transparent'
              : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <FaInstagram />
          인스타
        </button>
        <button
          type="button"
          onClick={() => setSelectedPlatform('tiktok')}
          className={`px-3 py-2 rounded-full text-xs font-semibold border transition flex items-center gap-2 ${
            selectedPlatform === 'tiktok'
              ? 'bg-blue-600 text-white border-transparent'
              : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <FaTiktok />
          틱톡
        </button>
        <button
          type="button"
          onClick={() => setSelectedPlatform('other')}
          className={`px-3 py-2 rounded-full text-xs font-semibold border transition flex items-center gap-2 ${
            selectedPlatform === 'other'
              ? 'bg-blue-600 text-white border-transparent'
              : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <FaGlobe />
          기타
        </button>
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center text-gray-600 dark:text-gray-400">
          아직 연결된 SNS 콘텐츠가 없습니다.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pagedItems.map((item) => {
              const categoryInfo = getCategoryInfo(item.category, categories);
              const thumbPosition = item.thumbnailUrl
                ? { objectPosition: `${item.thumbnailPositionX ?? 50}% ${item.thumbnailPositionY ?? 50}%` }
                : undefined;
              const thumbnailReady = item.thumbnailUrl && !imageErrors[item.id];
              const thumbnailSrc = item.thumbnailUrl || '';
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm hover:shadow-md transition"
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative w-full sm:w-40 h-28 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                      {thumbnailReady ? (
                        <Image
                          src={thumbnailSrc}
                          alt={item.appName}
                          fill
                          className="object-cover"
                          style={thumbPosition}
                          unoptimized
                          referrerPolicy="no-referrer"
                          onError={() => setImageErrors((prev) => ({ ...prev, [item.id]: true }))}
                        />
                      ) : (
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-300 px-3 text-center">
                          {categoryInfo.label}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                          {item.platform === 'instagram' || item.platform === 'youtube' || item.platform === 'blog' ? (
                            <Image
                              src={
                                item.platform === 'instagram'
                                  ? '/instagram-icon.svg'
                                  : item.platform === 'youtube'
                                    ? '/youtube.svg'
                                    : '/naver-blog.svg'
                              }
                              alt={item.platform}
                              width={18}
                              height={18}
                            />
                          ) : (
                            <FaGlobe className="text-gray-400" />
                          )}
                          {platformLabel(item.platform)}
                          <span className="ml-2 text-xs font-semibold text-gray-400 dark:text-gray-500">
                            {categoryInfo.label}
                          </span>
                        </div>
                        <Link
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-700"
                        >
                          <FaLink />
                          열기
                        </Link>
                      </div>

                      <p className="mt-2 text-base font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
                        {item.appName}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                        {item.label || item.hostname}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <FaUser className="text-gray-400" />
                          {item.createdByName}
                        </span>
                        <Link
                          href={`/apps/${item.appId}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {item.appName}
                        </Link>
                        <Link
                          href={item.appUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-500 dark:text-gray-400 hover:underline"
                        >
                          앱 링크
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 disabled:opacity-50"
            >
              이전
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 disabled:opacity-50"
            >
              다음
            </button>
          </div>
        </>
      )}
    </div>
  );
}
