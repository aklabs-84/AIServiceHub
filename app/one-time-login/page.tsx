'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useOneTimeAccess } from '@/contexts/OneTimeAccessContext';

const TOKEN_KEY = 'oneTimeAccessToken';

export default function OneTimeLoginPage() {
  const router = useRouter();
  const { isActive, expiresAt, refresh, clear } = useOneTimeAccess();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const response = await fetch('/api/one-time/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error || '로그인에 실패했습니다.');
        return;
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      await refresh(data.token);
      setSuccess(true);
      setUsername('');
      setPassword('');
      router.push('/apps');
    } catch (err) {
      console.error('One-time login failed:', err);
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">일회용 로그인</h1>
            <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">홈으로</Link>
          </div>

          {isActive && (
            <div className="mb-6 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              이미 일회용 로그인 상태입니다. {expiresAt ? `만료: ${new Date(expiresAt).toLocaleString('ko-KR')}` : ''}
              <button
                type="button"
                onClick={clear}
                className="ml-3 text-xs text-emerald-700 dark:text-emerald-300 underline"
              >
                로그아웃
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">ID</label>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none"
                placeholder="일회용 ID"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">PW</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none"
                placeholder="일회용 PW"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {success && <p className="text-sm text-emerald-500">로그인 완료! 앱 목록으로 이동합니다.</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-blue-600 text-white py-3 font-semibold shadow hover:bg-blue-700 transition disabled:opacity-60"
            >
              일회용 로그인
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
