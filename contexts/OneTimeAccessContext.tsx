'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const TOKEN_KEY = 'oneTimeAccessToken';

interface OneTimeAccessContextType {
  isActive: boolean;
  expiresAt: string | null;
  refresh: (tokenOverride?: string | null) => Promise<void>;
  clear: () => void;
}

const OneTimeAccessContext = createContext<OneTimeAccessContextType>({
  isActive: false,
  expiresAt: null,
  refresh: async () => {},
  clear: () => {},
});

export const useOneTimeAccess = () => useContext(OneTimeAccessContext);

export function OneTimeAccessProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const clear = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
    }
    setIsActive(false);
    setExpiresAt(null);
  }, []);

  const refresh = useCallback(async (tokenOverride?: string | null) => {
    const token = tokenOverride ?? (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null);
    if (!token) {
      clear();
      return;
    }
    try {
      const response = await fetch('/api/one-time/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (data.active) {
        setIsActive(true);
        setExpiresAt(data.expiresAt || null);
      } else {
        clear();
      }
    } catch (error) {
      console.error('Failed to validate one-time access:', error);
      clear();
    }
  }, [clear]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      isActive,
      expiresAt,
      refresh,
      clear,
    }),
    [isActive, expiresAt, refresh, clear]
  );

  return (
    <OneTimeAccessContext.Provider value={value}>
      {children}
    </OneTimeAccessContext.Provider>
  );
}
