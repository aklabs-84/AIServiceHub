'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function FailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const code = searchParams.get('code') || '';
  const message = searchParams.get('message') || '결제가 취소되거나 실패했습니다.';

  return (
    <div className="flex flex-col items-center gap-6 py-20">
      <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-4xl">
        ✕
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">결제 실패</h1>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm">{message}</p>
      {code && (
        <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">오류 코드: {code}</p>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => router.back()}
          className="px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          다시 시도
        </button>
        <button
          onClick={() => router.push('/apps')}
          className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          앱 둘러보기
        </button>
      </div>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <main className="min-h-screen max-w-lg mx-auto px-4">
      <Suspense>
        <FailContent />
      </Suspense>
    </main>
  );
}
