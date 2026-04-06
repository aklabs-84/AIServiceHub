// 앱 카드 / 프롬프트 카드 스켈레톤 — 실제 카드 레이아웃과 동일한 비율

export function AppCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
      {/* 썸네일 영역 */}
      <div className="skeleton h-40 w-full rounded-none" />
      {/* 본문 */}
      <div className="p-4 space-y-3">
        {/* 카테고리 뱃지 */}
        <div className="skeleton h-5 w-20 rounded-full" />
        {/* 제목 */}
        <div className="skeleton h-5 w-4/5" />
        {/* 설명 2줄 */}
        <div className="space-y-1.5">
          <div className="skeleton h-3.5 w-full" />
          <div className="skeleton h-3.5 w-2/3" />
        </div>
        {/* 하단 메타 */}
        <div className="flex items-center justify-between pt-1">
          <div className="skeleton h-4 w-16 rounded-full" />
          <div className="skeleton h-4 w-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function AppCardSkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <AppCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PromptCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 p-5 space-y-3">
      {/* 카테고리 + 난이도 */}
      <div className="flex gap-2">
        <div className="skeleton h-5 w-20 rounded-full" />
        <div className="skeleton h-5 w-14 rounded-full" />
      </div>
      {/* 제목 */}
      <div className="skeleton h-5 w-3/4" />
      {/* 설명 */}
      <div className="space-y-1.5">
        <div className="skeleton h-3.5 w-full" />
        <div className="skeleton h-3.5 w-5/6" />
      </div>
      {/* 태그들 */}
      <div className="flex gap-1.5 pt-1">
        <div className="skeleton h-5 w-12 rounded-full" />
        <div className="skeleton h-5 w-16 rounded-full" />
        <div className="skeleton h-5 w-10 rounded-full" />
      </div>
      {/* 하단 */}
      <div className="flex items-center justify-between pt-1">
        <div className="skeleton h-4 w-20 rounded-full" />
        <div className="skeleton h-4 w-10 rounded-full" />
      </div>
    </div>
  );
}

export function PromptCardSkeletonGrid({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <PromptCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** 단순 라인 스켈레톤 — 목록 행 (어드민 등) */
export function RowSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
          <div className="skeleton h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-1/3" />
            <div className="skeleton h-3 w-1/2" />
          </div>
          <div className="skeleton h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
