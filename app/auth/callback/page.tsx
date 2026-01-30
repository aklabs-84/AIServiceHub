
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  useEffect(() => {
    const handleCallback = async () => {
      if (code) {
        // 클라이언트 사이드에서 코드 교환 (LocalStorage의 verifier 사용)
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('Auth callback error:', error);
          router.push('/auth/auth-code-error');
        } else {
          router.push(next);
        }
      } else {
         router.push('/'); 
      }
    };

    handleCallback();
  }, [code, next, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">로그인 처리 중...</p>
      </div>
    </div>
  );
}
