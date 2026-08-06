export default function AppSplash() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-5">
      <div className="relative w-16 h-16">
        <img
          src="/favicon_io/android-chrome-192x192.png"
          alt=""
          width={64}
          height={64}
          className="w-16 h-16 rounded-2xl shadow-xl animate-pulse"
        />
        <span className="absolute -inset-2 rounded-3xl border-2 border-indigo-400/40 dark:border-indigo-300/30 border-t-indigo-500 dark:border-t-indigo-400 animate-spin" />
      </div>
      <p className="text-sm text-gray-400 dark:text-gray-500 tracking-wide">불러오는 중...</p>
    </div>
  );
}
