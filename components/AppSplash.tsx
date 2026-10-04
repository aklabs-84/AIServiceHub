// 페이지 이동/로딩 중 보여주는 미니멀 스플래시: 로고가 부드럽게 떠오르고 점 3개가 순서대로 켜진다.
export default function AppSplash() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4" role="status" aria-live="polite">
      <style>{`
        @keyframes splash-float { 50% { transform: translateY(-7px); } }
        @keyframes splash-shadow { 50% { transform: scale(.75); opacity: .6; } }
        @keyframes splash-dot { 0%, 80%, 100% { opacity: .25; transform: scale(.8); } 40% { opacity: 1; transform: scale(1.25); } }
        .splash-logo { animation: splash-float 1.8s ease-in-out infinite; }
        .splash-shadow { animation: splash-shadow 1.8s ease-in-out infinite; }
        .splash-dot { animation: splash-dot 1.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .splash-logo, .splash-shadow, .splash-dot { animation: none; }
          .splash-dot { opacity: .6; }
        }
      `}</style>
      <img
        src="/favicon_io/android-chrome-192x192.png"
        alt=""
        width={64}
        height={64}
        className="splash-logo w-16 h-16 rounded-2xl shadow-lg shadow-indigo-500/20"
      />
      <span className="splash-shadow -mt-2 w-10 h-1.5 rounded-full bg-indigo-500/20 blur-[2px]" />
      <div className="flex items-center gap-1.5 h-2">
        <i className="splash-dot w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400" />
        <i className="splash-dot w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400" style={{ animationDelay: '.15s' }} />
        <i className="splash-dot w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400" style={{ animationDelay: '.3s' }} />
      </div>
      <p className="text-sm text-gray-400 dark:text-gray-500 tracking-wide">불러오는 중</p>
    </div>
  );
}
