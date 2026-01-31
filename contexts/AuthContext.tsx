
'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { ensureUserProfile } from '@/lib/db';

interface AuthContextType {
  user: User | null;
  role: 'user' | 'admin' | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithKakao: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isAdmin: false,
  loading: true,
  signInWithGoogle: async () => { },
  signInWithKakao: async () => { },
  signOut: async () => { },
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

type AuthProviderProps = {
  children: React.ReactNode;
  initialUser?: User | null;
};

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(initialUser);
  const [role, setRole] = useState<'user' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);

  const getRedirectTo = () => {
    const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    return `${base.replace(/\/$/, '')}/auth/callback`;
  };

  const syncSessionFromServer = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session', { cache: 'no-store' });
      if (!response.ok) return false;
      const data = await response.json();
      if (!data?.session) return false;

      const { access_token, refresh_token, user: serverUser } = data.session;
      const activeUser = serverUser ?? null;
      if (activeUser) {
        setUser(activeUser);
      }
      if (access_token && refresh_token) {
        const { data: { session } } = await supabase.auth.setSession({ access_token, refresh_token });
        const mergedUser = session?.user ?? activeUser;
        setUser(mergedUser);
        if (mergedUser) {
          await fetchUserRole(mergedUser.id);
        }
        router.refresh();
        return true;
      }
      if (activeUser) {
        await fetchUserRole(activeUser.id);
        router.refresh();
      }
      return !!activeUser;
    } catch (error) {
      console.error('Failed to sync auth session from server:', error);
      return false;
    }
  }, [router]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        // initialUser가 있으면 먼저 role만 가져오고 로딩 해제
        if (initialUser) {
          try {
            await fetchUserRole(initialUser.id);
          } catch (e) {
            console.error('Error fetching user role:', e);
          }
          // 백그라운드에서 세션 동기화 (await 하지 않음)
          syncSessionFromServer();
          return;
        }

        // initialUser 없으면 기존 로직
        const synced = await syncSessionFromServer();
        if (!mounted) return;
        if (!synced) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!mounted) return;
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
              await fetchUserRole(currentUser.id);
            }
          } catch (error) {
            console.error('Error fetching session:', error);
          }
        }
      } finally {
        // 어떤 경우든 반드시 로딩 해제
        if (mounted) setLoading(false);
      }
    };

    bootstrap();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      try {
        if (currentUser) {
          await fetchUserRole(currentUser.id);

          if (event === 'SIGNED_IN') {
            const { id, email, user_metadata } = currentUser;
            const displayName = user_metadata.full_name || user_metadata.name;
            await ensureUserProfile(id, email, displayName);
          }
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            router.refresh();
          }
        } else {
          setRole(null);
          if (event === 'SIGNED_OUT') {
            setUser(null);
            router.refresh();
          }
        }
      } catch (error) {
        console.error('Error handling auth change:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [syncSessionFromServer, initialUser]);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (data) {
        setRole(data.role as 'user' | 'admin');
      }
    } catch {
      // 역할 가져오기 실패 시 무시 (기본값 사용)
    }
  };

  const signInWithGoogle = async () => {
    const redirectTo = getRedirectTo();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
    if (data?.url) {
      window.location.assign(data.url);
      return;
    }
    throw new Error('OAuth redirect URL is missing.');
  };

  const signInWithKakao = async () => {
    const redirectTo = getRedirectTo();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.error('Error signing in with Kakao:', error);
      throw error;
    }
    if (data?.url) {
      window.location.assign(data.url);
      return;
    }
    throw new Error('OAuth redirect URL is missing.');
  };

  const signOut = async () => {
    // 먼저 로컬 상태 즉시 정리
    setUser(null);
    setRole(null);

    try {
      // 서버 쿠키 삭제
      await fetch('/api/auth/logout', { method: 'POST' });
      // 클라이언트 Supabase 로그아웃
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('Error signing out:', error);
    }

    // 상태와 관계없이 홈으로 이동 및 새로고침
    router.push('/');
    router.refresh();
  };

  return (
    <AuthContext.Provider value={{ user, role, isAdmin: role === 'admin', loading, signInWithGoogle, signInWithKakao, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
