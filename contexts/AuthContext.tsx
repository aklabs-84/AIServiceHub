
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
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

  useEffect(() => {
    let mounted = true;
    let sessionChecked = false;

    // 1. Get initial session with timeout safety
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserRole(session.user.id);
        }
      } catch (error) {
        console.error('Error fetching session:', error);
      } finally {
        sessionChecked = true;
        if (mounted) setLoading(false);
      }
    };

    getSession();

    // Safety timeout: only trigger if session check hasn't completed
    const timeoutId = setTimeout(() => {
      if (mounted && !sessionChecked) {
        console.warn('Auth session check timed out, forcing loading to false');
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    }, 3000);

    // 2. Listen for auth changes
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
        } else {
          setRole(null);
        }
      } catch (error) {
        console.error('Error handling auth change:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signInWithKakao = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('Error signing in with Kakao:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('로그아웃 타임아웃')), 5000)
      );
      await Promise.race([supabase.auth.signOut(), timeoutPromise]);
      setUser(null);
      setRole(null);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
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
