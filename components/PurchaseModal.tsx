'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface PurchaseModalProps {
  productId: string;
  productType: 'app' | 'prompt';
  productName: string;
  price: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PurchaseModal({
  productId,
  productType,
  productName,
  price,
  onClose,
  onSuccess,
}: PurchaseModalProps) {
  const { session, user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePurchase = async () => {
    if (!session || !user) {
      router.push('/auth/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1) 서버에서 pending 레코드 생성 + 검증된 가격 수신
      const pendingRes = await fetch('/api/purchases/pending', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ productType, productId }),
      });

      if (!pendingRes.ok) {
        const err = await pendingRes.json();
        throw new Error(err.error || '결제 준비 실패');
      }

      const { orderId, amount } = await pendingRes.json();

      // 2) Toss Payments SDK 로드 + 결제 요청
      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey) throw new Error('결제 설정이 올바르지 않습니다');

      const tossPayments = await loadTossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey: user.id });

      const successUrl = new URL('/payment/success', window.location.origin);
      successUrl.searchParams.set('productType', productType);
      successUrl.searchParams.set('productId', productId);

      const failUrl = new URL('/payment/fail', window.location.origin);

      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: amount },
        orderId,
        orderName: productName,
        successUrl: successUrl.toString(),
        failUrl: failUrl.toString(),
        customerName: user.user_metadata?.name || user.email || '사용자',
        customerEmail: user.email || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다');
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
              {productType === 'app' ? '앱 구매' : '프롬프트 구매'}
            </span>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mt-1 leading-tight">
              {productName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
          >
            ✕
          </button>
        </div>

        {/* Price */}
        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-4 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-500 dark:text-gray-400">결제 금액</span>
          <span className="text-2xl font-black text-gray-900 dark:text-white">
            {price.toLocaleString()}원
          </span>
        </div>

        {/* Benefits */}
        <ul className="space-y-2">
          {[
            '영구 소장 — 한 번 구매로 평생 이용',
            '모든 기기에서 즉시 접근 가능',
            '업데이트 시 자동 반영',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="text-green-500 font-bold">✓</span>
              {item}
            </li>
          ))}
        </ul>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {/* CTA */}
        <button
          onClick={handlePurchase}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black text-base transition-colors"
        >
          {loading ? '처리 중...' : `${price.toLocaleString()}원 결제하기`}
        </button>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          토스페이먼츠를 통한 안전한 결제
        </p>
      </div>
    </div>
  );
}
