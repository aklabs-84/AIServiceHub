export default function ContentDetailLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* 뒤로가기 버튼 skeleton */}
        <div className="w-32 h-5 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse mb-8" />

        <article>
          {/* 토픽 + 날짜 */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-16 h-5 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="w-24 h-4 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
          </div>

          {/* 제목 */}
          <div className="mb-5 space-y-2">
            <div className="w-4/5 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="w-2/5 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
          </div>

          {/* 작성자 */}
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="w-20 h-4 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
          </div>

          <hr className="border-gray-100 dark:border-gray-800 mb-6" />

          {/* 본문 lines */}
          <div className="space-y-3 mb-6">
            {[100, 95, 88, 92, 70, 85, 60].map((w, i) => (
              <div
                key={i}
                className="h-4 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse"
                style={{ width: `${w}%`, animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>

          {/* 이미지 placeholder */}
          <div className="w-full h-56 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse mb-6" style={{ animationDelay: '200ms' }} />

          {/* 좋아요/댓글 */}
          <div className="flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-800 mt-8">
            <div className="w-24 h-9 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="w-16 h-5 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
          </div>
        </article>
      </div>
    </div>
  );
}
