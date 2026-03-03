/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { THEME_IDS, type ThemeId, isThemeId } from '../theme/themeRegistry';

export type ColorSchemePreference = 'light' | 'dark' | 'system';

export interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  colorScheme: ColorSchemePreference;
  setColorScheme: (pref: ColorSchemePreference) => void;
  availableThemes: ThemeId[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const availableThemes = [...THEME_IDS];

function getSystemDarkMode(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem('app-theme');
    const normalized = saved === 'default' ? 'neobrutalist' : saved;
    return isThemeId(normalized) ? normalized : 'neobrutalist';
  });

  const [colorScheme, setColorSchemeState] = useState<ColorSchemePreference>(() => {
    const saved = localStorage.getItem('app-color-scheme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;

    const legacyDark = localStorage.getItem('app-dark-mode');
    if (legacyDark === 'true') return 'dark';
    if (legacyDark === 'false') return 'light';
    return 'system';
  });

  const [systemDark, setSystemDark] = useState(getSystemDarkMode);

  const isDarkMode = colorScheme === 'system' ? systemDark : colorScheme === 'dark';

  const setTheme = useCallback((nextTheme: ThemeId) => {
    setThemeState(nextTheme);
    localStorage.setItem('app-theme', nextTheme);
  }, []);

  const setColorScheme = useCallback((pref: ColorSchemePreference) => {
    setColorSchemeState(pref);
    localStorage.setItem('app-color-scheme', pref);
    localStorage.removeItem('app-dark-mode');
  }, []);

  const toggleDarkMode = useCallback(() => {
    setColorScheme(isDarkMode ? 'light' : 'dark');
  }, [isDarkMode, setColorScheme]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const root = document.body;

    root.classList.remove('neo-dark-mode');
    for (const registeredTheme of THEME_IDS) {
      if (registeredTheme !== 'neobrutalist') {
        root.classList.remove(`theme-${registeredTheme}`);
      }
    }

    root.classList.add('theme-transitioning');
    const transitionTimeout = setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 400);

    if (theme !== 'neobrutalist') {
      root.classList.add(`theme-${theme}`);
    }

    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    return () => clearTimeout(transitionTimeout);
  }, [theme, isDarkMode]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        isDarkMode,
        toggleDarkMode,
        colorScheme,
        setColorScheme,
        availableThemes: THEME_IDS,
      }}
    >
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
