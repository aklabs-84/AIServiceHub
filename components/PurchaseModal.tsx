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

type PayTab = 'card' | 'bank';
type BankStep = 'form' | 'done';

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
  const [tab, setTab] = useState<PayTab>('card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 계좌이체 상태
  const [depositorName, setDepositorName] = useState('');
  const [bankStep, setBankStep] = useState<BankStep>('form');
  const [bankInfo, setBankInfo] = useState<{ bankName: string; accountNumber: string; accountHolder: string } | null>(null);

  // ── 카드 결제 ──
  const handleCardPurchase = async () => {
    if (!session || !user) { router.push('/auth/login'); return; }
    setLoading(true);
    setError('');
    try {
      const pendingRes = await fetch('/api/purchases/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ productType, productId }),
      });
      if (!pendingRes.ok) {
        const err = await pendingRes.json();
        throw new Error(err.error || '결제 준비 실패');
      }
      const { orderId, amount } = await pendingRes.json();

      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey) throw new Error('결제 설정이 올바르지 않습니다');

      const tossPayments = await loadTossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey: user.id });

      const successUrl = new URL('/payment/success', window.location.origin);
      successUrl.searchParams.set('productType', productType);
      successUrl.searchParams.set('productId', productId);

      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: amount },
        orderId,
        orderName: productName,
        successUrl: successUrl.toString(),
        failUrl: new URL('/payment/fail', window.location.origin).toString(),
        customerName: user.user_metadata?.name || user.email || '사용자',
        customerEmail: user.email || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다');
      setLoading(false);
    }
  };

  // ── 계좌이체 신청 ──
  const handleBankRequest = async () => {
    if (!session || !user) { router.push('/auth/login'); return; }
    if (!depositorName.trim()) { setError('입금자명을 입력해 주세요'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/purchases/bank-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ productType, productId, depositorName: depositorName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '신청 실패');
      }
      const data = await res.json();
      setBankInfo(data.bankInfo);
      setBankStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다');
    } finally {
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1">✕</button>
        </div>

        {/* Price */}
        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-4 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-500 dark:text-gray-400">결제 금액</span>
          <span className="text-2xl font-black text-gray-900 dark:text-white">{price.toLocaleString()}원</span>
        </div>

        {/* 결제 수단 탭 — 카드 결제는 Toss 심사 완료 후 활성화 예정 */}
        {/* CARD_PAYMENT_ENABLED: false → 탭 UI 숨김 */}

        {/* ── 카드 탭 ── */}
        {tab === 'card' && false && (
          <>
            <ul className="space-y-2">
              {['영구 소장 — 한 번 구매로 평생 이용', '모든 기기에서 즉시 접근 가능', '업데이트 시 자동 반영'].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-green-500 font-bold">✓</span>{item}
                </li>
              ))}
            </ul>
            {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">{error}</p>}
            <button
              onClick={handleCardPurchase}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black text-base transition-colors"
            >
              {loading ? '처리 중...' : `${price.toLocaleString()}원 결제하기`}
            </button>
            <p className="text-center text-xs text-gray-400 dark:text-gray-500">토스페이먼츠를 통한 안전한 결제</p>
          </>
        )}

        {/* ── 계좌이체 탭 ── */}
        {tab === 'bank' && bankStep === 'form' && (
          <>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 space-y-1 text-sm">
              <p className="font-bold text-blue-800 dark:text-blue-300">입금 방법</p>
              <p className="text-blue-700 dark:text-blue-400">① 아래 계좌로 정확한 금액을 이체해 주세요.</p>
              <p className="text-blue-700 dark:text-blue-400">② 입금자명을 반드시 동일하게 입력해 주세요.</p>
              <p className="text-blue-700 dark:text-blue-400">③ 관리자 확인 후 콘텐츠가 활성화됩니다 (최대 24시간)</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">은행</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {process.env.NEXT_PUBLIC_BANK_NAME || '관리자 문의'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">계좌번호</span>
                <span className="font-bold text-gray-900 dark:text-white font-mono">
                  {process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || '관리자 문의'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">예금주</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {process.env.NEXT_PUBLIC_BANK_ACCOUNT_HOLDER || '관리자 문의'}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                <span className="text-gray-500">입금 금액</span>
                <span className="font-black text-blue-600 dark:text-blue-400">{price.toLocaleString()}원</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">입금자명 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={depositorName}
                onChange={(e) => setDepositorName(e.target.value)}
                placeholder="통장에 표시될 이름"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">{error}</p>}

            <button
              onClick={handleBankRequest}
              disabled={loading || !depositorName.trim()}
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black text-base transition-colors"
            >
              {loading ? '신청 중...' : '입금 신청하기'}
            </button>
          </>
        )}

        {/* ── 계좌이체 완료 ── */}
        {tab === 'bank' && bankStep === 'done' && (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-3xl">✓</div>
            <div>
              <p className="font-black text-gray-900 dark:text-white text-lg">입금 신청 완료!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                관리자가 입금을 확인하면 콘텐츠가 활성화됩니다.<br />
                (영업일 기준 최대 24시간 소요)
              </p>
            </div>
            {bankInfo && (
              <div className="w-full bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 text-sm space-y-1 text-left">
                <div className="flex justify-between"><span className="text-gray-500">은행</span><span className="font-bold">{bankInfo.bankName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">계좌번호</span><span className="font-bold font-mono">{bankInfo.accountNumber}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">예금주</span><span className="font-bold">{bankInfo.accountHolder}</span></div>
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                  <span className="text-gray-500">입금 금액</span>
                  <span className="font-black text-blue-600">{price.toLocaleString()}원</span>
                </div>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
