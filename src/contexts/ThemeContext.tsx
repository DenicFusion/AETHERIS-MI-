import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Theme = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'dark';
  });
  
  const { user } = useAuth();

  useEffect(() => {
    if (user?.uid) {
      const fetchTheme = async () => {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists() && snap.data().theme) {
            setThemeState(snap.data().theme as Theme);
            localStorage.setItem('theme', snap.data().theme);
          }
        } catch (e: any) {
          if (!e?.message?.includes?.('offline') && !e?.message?.includes?.('permission-denied')) {
            console.warn("Theme sync skipped:", e?.message || e);
          }
        }
      };
      fetchTheme();
    }
  }, [user]);

  const applyTheme = (mode: 'dark' | 'light') => {
    document.documentElement.setAttribute('data-theme', mode);
  };

  useEffect(() => {
    const applySystemTheme = () => {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(isDark ? 'dark' : 'light');
    };

    if (theme === 'system') {
      applySystemTheme();
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      applyTheme(theme);
    }
  }, [theme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          theme: newTheme
        });
      } catch (err) {
        console.error('Failed to save theme to profile', err);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
