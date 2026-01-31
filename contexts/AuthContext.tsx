
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
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
      setLoading(true);
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
      if (mounted) setLoading(false);
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
  }, [syncSessionFromServer]);

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
    try {
      await supabase.auth.signOut({ scope: 'local' });
      setUser(null);
      setRole(null);
      router.push('/');

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('로그아웃 타임아웃')), 5000)
      );
      await Promise.race([supabase.auth.signOut(), timeoutPromise]);
    } catch (error) {
      console.error('Error signing out:', error);
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // ignore
      }
      // 타임아웃 또는 에러 시에도 로컬 상태 정리
      setUser(null);
      setRole(null);
      router.push('/');
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, isAdmin: role === 'admin', loading, signInWithGoogle, signInWithKakao, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
