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
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const nextTheme = savedTheme || 'dark';
    if (nextTheme !== theme) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(nextTheme);
    }
    console.log('💾 Saved theme from localStorage:', nextTheme);
    applyTheme(nextTheme);
    if (!savedTheme) {
      localStorage.setItem('theme', nextTheme);
    }
  }, [applyTheme, theme]);

  const toggleTheme = useCallback(() => {
    console.log('🔄 Toggle clicked! Current theme:', theme);
    const newTheme = theme === 'light' ? 'dark' : 'light';
    console.log('➡️ New theme will be:', newTheme);

    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  }, [theme, applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
