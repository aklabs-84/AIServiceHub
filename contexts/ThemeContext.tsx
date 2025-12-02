'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  const applyTheme = useCallback((newTheme: Theme) => {
    const root = document.documentElement;
    console.log('🎨 Applying theme:', newTheme);
    console.log('📋 Current classes:', root.classList.toString());

    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    console.log('✅ After classes:', root.classList.toString());
  }, []);

  useEffect(() => {
    setMounted(true);

    // 로컬 스토리지에서 테마 불러오기
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    console.log('💾 Saved theme from localStorage:', savedTheme);

    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      // 기본값을 다크 모드로 설정
      setTheme('dark');
      applyTheme('dark');
      localStorage.setItem('theme', 'dark');
    }
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    console.log('🔄 Toggle clicked! Current theme:', theme);
    const newTheme = theme === 'light' ? 'dark' : 'light';
    console.log('➡️ New theme will be:', newTheme);

    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  }, [theme, applyTheme]);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}