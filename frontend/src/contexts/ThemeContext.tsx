/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type ColorSchemePreference = 'light' | 'dark' | 'system';

export interface ThemeContextType {
    theme: string;
    setTheme: (theme: string) => void;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    colorScheme: ColorSchemePreference;
    setColorScheme: (pref: ColorSchemePreference) => void;
    availableThemes: string[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const availableThemes = ['neobrutalist', 'sea-breeze', 'corporate', 'clean-modern', 'glass', 'high-contrast'];

function getSystemDarkMode(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('app-theme');
        const normalized = saved === 'default' ? 'neobrutalist' : saved;
        return normalized && availableThemes.includes(normalized) ? normalized : 'neobrutalist';
    });

    const [colorScheme, setColorSchemeState] = useState<ColorSchemePreference>(() => {
        const saved = localStorage.getItem('app-color-scheme');
        if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
        // Migrate legacy dark mode preference
        const legacyDark = localStorage.getItem('app-dark-mode');
        if (legacyDark === 'true') return 'dark';
        if (legacyDark === 'false') return 'light';
        return 'system';
    });

    const [systemDark, setSystemDark] = useState(getSystemDarkMode);

    const isDarkMode = colorScheme === 'system' ? systemDark : colorScheme === 'dark';

    const setColorScheme = useCallback((pref: ColorSchemePreference) => {
        setColorSchemeState(pref);
        localStorage.setItem('app-color-scheme', pref);
        // Clean up legacy key
        localStorage.removeItem('app-dark-mode');
    }, []);

    const toggleDarkMode = useCallback(() => {
        setColorScheme(isDarkMode ? 'light' : 'dark');
    }, [isDarkMode, setColorScheme]);

    // Listen for OS color scheme changes
    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    useEffect(() => {
        const root = document.body;

        // Clean up classes
        root.classList.remove('neo-dark-mode'); // Legacy cleanup
        availableThemes.forEach(t => {
            if (t !== 'neobrutalist') root.classList.remove(`theme-${t}`);
        });

        // Apply theme transition class for smooth switching
        root.classList.add('theme-transitioning');
        const transitionTimeout = setTimeout(() => {
            root.classList.remove('theme-transitioning');
        }, 400);

        // Apply Theme Class
        if (theme !== 'neobrutalist') {
            root.classList.add(`theme-${theme}`);
        }

        // Persist Theme
        localStorage.setItem('app-theme', theme);

        // Apply Dark Mode Class
        if (isDarkMode) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        return () => clearTimeout(transitionTimeout);
    }, [theme, isDarkMode]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, isDarkMode, toggleDarkMode, colorScheme, setColorScheme, availableThemes }}>
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
