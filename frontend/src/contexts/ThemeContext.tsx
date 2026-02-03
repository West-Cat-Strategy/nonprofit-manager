import React, { createContext, useContext, useEffect, useState } from 'react';

export interface ThemeContextType {
    theme: string;
    setTheme: (theme: string) => void;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    availableThemes: string[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const availableThemes = ['default', 'sea-breeze', 'corporate', 'glass'];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('app-theme');
        return saved && availableThemes.includes(saved) ? saved : 'default';
    });

    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem('app-dark-mode') === 'true';
    });

    const toggleDarkMode = () => {
        setIsDarkMode(prev => !prev);
    };

    useEffect(() => {
        const root = document.body;

        // Clean up classes
        root.classList.remove('neo-dark-mode'); // Legacy cleanup
        availableThemes.forEach(t => {
            if (t !== 'default') root.classList.remove(`theme-${t}`);
        });

        // Apply Theme Class
        if (theme !== 'default') {
            root.classList.add(`theme-${theme}`);
        }

        // Persist Theme
        localStorage.setItem('app-theme', theme);

        // Apply Dark Mode Class
        if (isDarkMode) {
            root.classList.add('dark');
            localStorage.setItem('app-dark-mode', 'true');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('app-dark-mode', 'false');
        }

    }, [theme, isDarkMode]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, isDarkMode, toggleDarkMode, availableThemes }}>
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
