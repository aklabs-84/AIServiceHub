'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Session, User } from '@supabase/supabase-js';
import { getBrowserClient, db } from '@/lib/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: 'user' | 'admin' | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithKakao: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const supabase = getBrowserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'user' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);
  const lastRoleUserIdRef = useRef<string | null>(null);

  const getRedirectTo = () => {
    const explicit = process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL?.trim();
    if (explicit) {
      return explicit.endsWith('/auth/callback')
        ? explicit
        : `${explicit.replace(/\/$/, '')}/auth/callback`;
    }

    if (typeof window !== 'undefined') {
      const { origin, hostname } = window.location;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${origin.replace(/\/$/, '')}/auth/callback`;
      }
      return `${origin.replace(/\/$/, '')}/auth/callback`;
    }

    const base = process.env.NEXT_PUBLIC_SITE_URL || '';
    return `${base.replace(/\/$/, '')}/auth/callback`;
  };

  const withTimeout = useCallback(async <T,>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(message)), ms);
    });
    try {
      return await Promise.race([promise, timeoutPromise]) as T;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }, []);

  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      const userRole = await withTimeout(
        db.auth.getUserRole(supabase, userId),
        7000,
        '역할 조회 시간이 초과되었습니다.'
      );
      setRole(userRole);
    } catch (e) {
      console.error('[Auth] fetchUserRole exception:', e);
      setRole('user');
    }
  }, [supabase, withTimeout]);

  const fetchSessionFromServer = useCallback(async (): Promise<Session | null> => {
    try {
      const response = await withTimeout(
        fetch('/api/auth/session', { cache: 'no-store' }),
        5000,
        '서버 세션 조회 시간이 초과되었습니다.'
      );
      if (!response.ok) return null;
      const payload = await response.json().catch(() => null);
      return (payload?.session ?? null) as Session | null;
    } catch (e) {
      console.error('[Auth] fetchSessionFromServer exception:', e);
      return null;
    }
  }, [withTimeout]);

  useEffect(() => {
    let isActive = true;
    const hardStopId = setTimeout(() => {
      if (!isActive) return;
      // 어떤 이유로든 auth 초기화가 지연되면 UI 고착 방지
      setLoading(false);
    }, 12000);

    const bootstrapSession = async () => {
      try {
        const { data: { session: clientSession } } = await withTimeout(
          supabase.auth.getSession(),
          10000,
          '세션 조회 시간이 초과되었습니다.'
        );
        if (!isActive) return;
        const resolvedSession = clientSession ?? await fetchSessionFromServer();
        if (!isActive) return;
        setSession(resolvedSession);
        if (resolvedSession?.user) {
          setLoading(false);
          if (lastRoleUserIdRef.current !== resolvedSession.user.id) {
            lastRoleUserIdRef.current = resolvedSession.user.id;
            void fetchUserRole(resolvedSession.user.id);
          }
        } else {
          setRole(null);
          setLoading(false);
        }
      } catch (e) {
        if (!isActive) return;
        console.error('[Auth] getSession exception. trying server fallback:', e);
        const fallbackSession = await fetchSessionFromServer();
        if (!isActive) return;
        setSession(fallbackSession);
        if (fallbackSession?.user) {
          setLoading(false);
          if (lastRoleUserIdRef.current !== fallbackSession.user.id) {
            lastRoleUserIdRef.current = fallbackSession.user.id;
            void fetchUserRole(fallbackSession.user.id);
          }
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    };

    void bootstrapSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isActive) return;
      setSession(nextSession);

      if (nextSession?.user) {
        setLoading(false);
        if (lastRoleUserIdRef.current !== nextSession.user.id) {
          lastRoleUserIdRef.current = nextSession.user.id;
          void fetchUserRole(nextSession.user.id);
        }

        if (event === 'SIGNED_IN') {
          const { id, email, user_metadata } = nextSession.user;
          const displayName = user_metadata.full_name || user_metadata.name;
          const avatarUrl = user_metadata.avatar_url || user_metadata.picture;
          void db.auth.ensureUserProfile(supabase, id, email, displayName, avatarUrl);
          router.refresh();
        }
      } else {
        lastRoleUserIdRef.current = null;
        setRole(null);
        setLoading(false);
      }
    });

    return () => {
      isActive = false;
      clearTimeout(hardStopId);
      subscription.unsubscribe();
    };
  }, [fetchSessionFromServer, fetchUserRole, router, supabase, withTimeout]);

  const signInWithGoogle = async () => {
    const currentPath = window.location.pathname + window.location.search;
    const redirectTo = `${getRedirectTo()}?next=${encodeURIComponent(currentPath)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) throw error;
  };

  const signInWithKakao = async () => {
    const currentPath = window.location.pathname + window.location.search;
    const redirectTo = `${getRedirectTo()}?next=${encodeURIComponent(currentPath)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      await fetch('/api/auth/logout', { method: 'POST' });

      // Only clear Supabase-related keys, not all localStorage
      if (typeof window !== 'undefined') {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.startsWith('supabase'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
      }

      // router.refresh()로 서버 컴포넌트 + 라우터 캐시 초기화 후 SPA 네비게이션
      // window.location.href 풀 리로드는 CSS 로딩 타이밍 이슈 발생
      router.refresh();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const user = session?.user ?? null;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      role,
      isAdmin: role === 'admin',
      loading,
      signInWithGoogle,
      signInWithKakao,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
