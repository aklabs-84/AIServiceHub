'use client';

interface LoadingDotsProps {
  /** 전체화면 중앙 배치 여부 (기본 true) */
  fullscreen?: boolean;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingDots({ fullscreen = true, message, size = 'md' }: LoadingDotsProps) {
  const dotSize = size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5';
  const gap = size === 'sm' ? 'gap-1.5' : 'gap-2';

  const dots = (
    <div className={`flex flex-col items-center gap-4`}>
      <div className={`flex ${gap} items-center`}>
        <span className={`loading-dot ${dotSize}`} />
        <span className={`loading-dot ${dotSize}`} />
        <span className={`loading-dot ${dotSize}`} />
      </div>
      {message && (
        <p className="text-sm text-gray-400 dark:text-gray-500 tracking-wide">{message}</p>
      )}
    </div>
  );

  if (!fullscreen) return dots;

  return (
    <div className="flex justify-center items-center min-h-screen">
      {dots}
    </div>
  );
}
