'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  getAdditionalUserInfo
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { sendSlackNotification } from '@/lib/notifications';
import { ensureUserProfile } from '@/lib/db';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const isNewUser = getAdditionalUserInfo(result)?.isNewUser;
      if (isNewUser && result.user) {
        const { uid, email, displayName } = result.user;
        await ensureUserProfile(uid, email, displayName || undefined);
        sendSlackNotification({
          type: 'signup',
          uid,
          email: email || undefined,
          name: displayName || '신규 사용자',
        });
      } else if (result.user) {
        // 기존 회원도 프로필이 없을 수 있으니 보장
        const { uid, email, displayName } = result.user;
        await ensureUserProfile(uid, email, displayName || undefined);
      }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'auth/popup-closed-by-user') {
        console.warn('Login popup closed by user.');
        return;
      }
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
