import Image from 'next/image';
import { Prompt } from '@/types/prompt';
import { getPromptCategoryInfo } from '@/lib/promptCategories';
import { useMemo, useState } from 'react';
import { FaCalendar, FaExternalLinkAlt, FaUser, FaShareAlt } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface PromptCardProps {
  prompt: Prompt;
}

export default function PromptCard({ prompt }: PromptCardProps) {
  const router = useRouter();
  const categoryInfo = getPromptCategoryInfo(prompt.category);
  const CategoryIcon = categoryInfo.icon;
  const [imageError, setImageError] = useState(false);
  const { user } = useAuth();

  const snsPreview = useMemo(() => prompt.snsUrls.slice(0, 2), [prompt.snsUrls]);
  const formatHost = (url: string) => {
    try {
      const { hostname } = new URL(url);
      return hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const badgeTone = (() => {
    switch (prompt.category) {
      case 'daily':
        return 'from-emerald-300 via-teal-400 to-emerald-500';
      case 'work':
        return 'from-blue-400 via-sky-500 to-blue-600';
      case 'fun':
        return 'from-purple-400 via-fuchsia-500 to-pink-500';
      case 'relationship':
        return 'from-rose-400 via-pink-500 to-red-500';
      case 'education':
        return 'from-amber-400 via-orange-500 to-yellow-400';
      default:
        return 'from-slate-200 via-slate-300 to-slate-400 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900';
    }
  })();

  return (
    <div
      className="group h-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg card-hover cursor-pointer"
      onClick={() => router.push(`/prompts/${prompt.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(`/prompts/${prompt.id}`);
        }
      }}
    >
      <div className="relative h-44 w-full">
        {prompt.thumbnailUrl && !imageError ? (
          <Image
            src={prompt.thumbnailUrl}
            alt={prompt.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${badgeTone} flex items-center justify-center relative overflow-hidden`}>
            <div className="absolute inset-0 opacity-20">
              <div className="absolute -right-10 -bottom-10 h-28 w-28 bg-white rounded-full" />
              <div className="absolute -left-6 -top-8 h-20 w-20 bg-white rounded-full" />
            </div>
            <CategoryIcon className="relative z-10 text-6xl text-white drop-shadow-lg group-hover:scale-110 transition-transform duration-300" />
          </div>
        )}

        <div className="absolute top-3 right-3 z-10">
          <span className="rounded-full bg-white/80 dark:bg-gray-900/80 text-gray-800 dark:text-gray-100 text-xs font-semibold px-3 py-1 shadow">
            {categoryInfo.label}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
            {prompt.name}
          </h3>
          <FaShareAlt className="text-emerald-500/70" />
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">
          {prompt.description}
        </p>

        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-2">
          <FaUser className="text-emerald-500" />
          <span>{prompt.createdByName}</span>
          <span className="text-gray-300 dark:text-gray-700">•</span>
          <FaCalendar className="text-emerald-400" />
          <span>{new Date(prompt.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <div className="inline-flex items-center space-x-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200 px-3 py-1 text-xs font-semibold">
            <FaExternalLinkAlt />
            <span>프롬프트/링크는 로그인 후 확인</span>
          </div>
          {user && (
            <>
              {snsPreview.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center space-x-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1 text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="truncate max-w-[120px]">{formatHost(url)}</span>
                </a>
              ))}
              {prompt.snsUrls.length > 2 && (
                <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  +{prompt.snsUrls.length - 2}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
