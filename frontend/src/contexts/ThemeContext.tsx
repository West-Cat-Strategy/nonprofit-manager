/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { THEME_IDS, THEME_REGISTRY, type ThemeId, isThemeId } from '../theme/themeRegistry';

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
const THEME_LINK_ID = 'app-theme-stylesheet';
const THEME_LINK_MARKER = 'data-managed-theme-link';
const themeBodyClasses = THEME_IDS.map((themeId) => `theme-${themeId}`);

function getMediaQueryMatches(query: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false;
}

function getSystemDarkMode(): boolean {
  return getMediaQueryMatches('(prefers-color-scheme: dark)');
}

function getReducedMotionPreference(): boolean {
  return getMediaQueryMatches('(prefers-reduced-motion: reduce)');
}

function getManagedThemeLink(): HTMLLinkElement | null {
  const managedLinks = Array.from(
    document.head.querySelectorAll<HTMLLinkElement>(
      `#${THEME_LINK_ID}, link[${THEME_LINK_MARKER}="true"]`
    )
  );
  const primaryLink = managedLinks.shift() ?? null;

  managedLinks.forEach((link) => link.remove());
  return primaryLink;
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
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getReducedMotionPreference);

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
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    setPrefersReducedMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const themeDef = THEME_REGISTRY[theme];
    const shouldAnimateThemeChange = !prefersReducedMotion;

    body.classList.remove('theme-transitioning');
    let transitionTimeout: ReturnType<typeof setTimeout> | null = null;

    if (shouldAnimateThemeChange) {
      body.classList.add('theme-transitioning');
      transitionTimeout = setTimeout(() => {
        body.classList.remove('theme-transitioning');
      }, 400);
    }

    themeBodyClasses.forEach((className) => {
      body.classList.remove(className);
      html.classList.remove(className);
    });

    body.classList.toggle('dark', isDarkMode);
    html.style.colorScheme = isDarkMode ? 'dark' : 'light';

    let linkElement = getManagedThemeLink();

    if (themeDef.cssPath) {
      if (!linkElement) {
        linkElement = document.createElement('link');
        linkElement.rel = 'stylesheet';
        document.head.appendChild(linkElement);
      }

      linkElement.id = THEME_LINK_ID;
      linkElement.setAttribute(THEME_LINK_MARKER, 'true');

      if (linkElement.getAttribute('href') !== themeDef.cssPath) {
        linkElement.href = themeDef.cssPath;
      }

      if (themeDef.bodyClass) {
        body.classList.add(themeDef.bodyClass);
      }
    } else if (linkElement) {
      linkElement.remove();
    }

    return () => {
      if (transitionTimeout) {
        clearTimeout(transitionTimeout);
      }
      body.classList.remove('theme-transitioning');
    };
  }, [theme, isDarkMode, prefersReducedMotion]);

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
