'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Session, User } from '@supabase/supabase-js';
import { getBrowserClient, db } from '@/lib/database';

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
  const supabase = getBrowserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'user' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);

  const getRedirectTo = () => {
    const base = typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SITE_URL || '');
    return `${base.replace(/\/$/, '')}/auth/callback`;
  };

  const fetchUserRole = async (userId: string) => {
    try {
      const userRole = await db.auth.getUserRole(supabase, userId);
      setRole(userRole);
    } catch (e) {
      console.error('[Auth] fetchUserRole exception:', e);
      setRole('user');
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);

      if (session?.user) {
        await fetchUserRole(session.user.id);

        if (event === 'SIGNED_IN') {
          const { id, email, user_metadata } = session.user;
          const displayName = user_metadata.full_name || user_metadata.name;
          const avatarUrl = user_metadata.avatar_url || user_metadata.picture;
          await db.auth.ensureUserProfile(supabase, id, email, displayName, avatarUrl);
          router.refresh();
        }
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (session === null || (session && role)) {
      setLoading(false);
    }
  }, [session, role]);

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

        // Next.js 라우터 캐시 및 이전 상태를 완전히 초기화하기 위해 강제 리로드와 함께 메인으로 이동
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const user = session?.user ?? null;

  return (
    <AuthContext.Provider value={{
      user,
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
