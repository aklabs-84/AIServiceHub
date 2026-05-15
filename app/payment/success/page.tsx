'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const confirmedRef = useState(false);

  useEffect(() => {
    // 인증 로딩 중이면 대기
    if (authLoading) return;

    // 이미 confirm 완료됐으면 재호출 방지
    if (confirmedRef[0]) return;

    const paymentKey = searchParams.get('paymentKey');
    const orderId = searchParams.get('orderId');
    const amount = searchParams.get('amount');
    const productType = searchParams.get('productType');
    const plan = searchParams.get('plan');

    if (!paymentKey || !orderId || !amount) {
      setErrorMsg('결제 정보가 올바르지 않습니다.');
      setStatus('error');
      return;
    }

    if (!session?.access_token) {
      setErrorMsg('로그인이 필요합니다. 다시 로그인 후 시도해 주세요.');
      setStatus('error');
      return;
    }

    confirmedRef[0] = true;

    async function confirm() {
      try {
        const res = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session!.access_token}`,
          },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: Number(amount),
            productType,
            plan,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          // 이미 처리된 결제는 성공으로 간주
          if (err.code === 'ALREADY_PROCESSED_PAYMENT') {
            setStatus('success');
            return;
          }
          throw new Error(err.error || '결제 확인 실패');
        }

        setStatus('success');
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : '결제 처리 중 오류가 발생했습니다.');
        setStatus('error');
      }
    }

    confirm();
  }, [authLoading, session, searchParams]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 dark:text-gray-300">결제를 처리하는 중입니다...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center gap-6 py-20">
        <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-4xl">
          ✕
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">결제 처리 실패</h1>
        <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm">{errorMsg}</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-20">
      <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-4xl">
        ✓
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">결제가 완료되었습니다</h1>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm">
        구매하신 콘텐츠를 이용하실 수 있습니다.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => router.push('/my?tab=purchases')}
          className="px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          구매 내역 보기
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

export default function PaymentSuccessPage() {
  return (
    <main className="min-h-screen max-w-lg mx-auto px-4">
      <Suspense>
        <SuccessContent />
      </Suspense>
    </main>
  );
}
