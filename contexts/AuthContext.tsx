
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Session, User } from '@supabase/supabase-js';
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
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'user' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);

  const getRedirectTo = () => {
    const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    return `${base.replace(/\/$/, '')}/auth/callback`;
  };

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('[Auth] Role fetch error:', error.message);
        if (error.code === 'PGRST116') {
          // Profile not found, create default
          const { data: newData, error: insertError } = await supabase
            .from('profiles')
            .upsert({ id: userId, role: 'user' })
            .select('role')
            .single();

          if (!insertError && newData) {
            setRole(newData.role as 'user' | 'admin');
          } else {
            setRole('user');
          }
        } else {
          setRole('user');
        }
      } else if (data) {
        setRole(data.role as 'user' | 'admin');
      }
    } catch (e) {
      console.error('[Auth] fetchUserRole exception:', e);
      setRole('user');
    }
  };

  // 초기 세션 로드 및 auth 변경 리스너
  useEffect(() => {
    // 1. 초기 세션 가져오기
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Auth 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);

      if (session?.user) {
        await fetchUserRole(session.user.id);

        if (event === 'SIGNED_IN') {
          const { id, email, user_metadata } = session.user;
          const displayName = user_metadata.full_name || user_metadata.name;
          await ensureUserProfile(id, email, displayName);
          router.refresh();
        }
        if (event === 'TOKEN_REFRESHED') {
          router.refresh();
        }
      } else {
        setRole(null);
        if (event === 'SIGNED_OUT') {
          setLoading(false);
          router.refresh();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // 로딩 상태 관리: session과 role이 모두 확정되면 로딩 해제
  useEffect(() => {
    if (session === null || (session && role)) {
      setLoading(false);
    }
  }, [session, role]);

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
      // 서버 쿠키 삭제
      await fetch('/api/auth/logout', { method: 'POST' });
      // 클라이언트 Supabase 로그아웃
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
    router.push('/');
  };

  const user = session?.user ?? null;

  return (
    <AuthContext.Provider value={{ user, role, isAdmin: role === 'admin', loading, signInWithGoogle, signInWithKakao, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
