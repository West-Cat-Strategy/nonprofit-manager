import { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme, type ColorSchemePreference } from '../contexts/ThemeContext';
import { SunIcon, MoonIcon, ComputerDesktopIcon, CheckIcon, EyeIcon } from '@heroicons/react/24/outline';

interface ThemeOption {
    id: string;
    label: string;
    description: string;
    preview: {
        bg: string;
        surface: string;
        text: string;
        accent: string;
        border: string;
        borderStyle: string;
    };
}

const themeOptions: ThemeOption[] = [
    {
        id: 'neobrutalist',
        label: 'Neobrutalist',
        description: 'Bold, playful, high-energy design',
        preview: {
            bg: '#F9FAFB',
            surface: '#FFFFFF',
            text: '#000000',
            accent: '#FFD700',
            border: '#000000',
            borderStyle: '3px solid',
        },
    },
    {
        id: 'sea-breeze',
        label: 'Sea Breeze',
        description: 'Soft, airy teal palette',
        preview: {
            bg: '#E0F2F1',
            surface: '#F5FCFD',
            text: '#004D40',
            accent: '#009688',
            border: '#80CBC4',
            borderStyle: '2px solid',
        },
    },
    {
        id: 'corporate',
        label: 'Corporate',
        description: 'Clean, professional, minimal',
        preview: {
            bg: '#FFFFFF',
            surface: '#F9FAFB',
            text: '#111827',
            accent: '#1F2937',
            border: '#E5E7EB',
            borderStyle: '1px solid',
        },
    },
    {
        id: 'clean-modern',
        label: 'Clean Modern',
        description: 'Crisp slate tones, blue accents',
        preview: {
            bg: '#F8FAFC',
            surface: '#FFFFFF',
            text: '#0F172A',
            accent: '#2563EB',
            border: '#E2E8F0',
            borderStyle: '1px solid',
        },
    },
    {
        id: 'glass',
        label: 'Glassmorphism',
        description: 'Frosted, translucent, futuristic',
        preview: {
            bg: '#B0BEC5',
            surface: 'rgba(226, 232, 240, 0.75)',
            text: '#0F172A',
            accent: '#00B0FF',
            border: '#CBD5E1',
            borderStyle: '1px solid',
        },
    },
    {
        id: 'high-contrast',
        label: 'High Contrast',
        description: 'Maximum readability, WCAG AAA',
        preview: {
            bg: '#FFFFFF',
            surface: '#FFFFFF',
            text: '#000000',
            accent: '#0047AB',
            border: '#000000',
            borderStyle: '3px solid',
        },
    },
];

const colorSchemeOptions: { value: ColorSchemePreference; label: string; icon: typeof SunIcon }[] = [
    { value: 'light', label: 'Light', icon: SunIcon },
    { value: 'dark', label: 'Dark', icon: MoonIcon },
    { value: 'system', label: 'System', icon: ComputerDesktopIcon },
];

export default function ThemeSelector() {
    const { theme, setTheme, colorScheme, setColorScheme } = useTheme();
    const [announcement, setAnnouncement] = useState('');
    const themeGridRef = useRef<HTMLDivElement>(null);
    const [focusedIndex, setFocusedIndex] = useState(() =>
        themeOptions.findIndex(o => o.id === theme)
    );

    const handleThemeSelect = useCallback((themeId: string) => {
        setTheme(themeId);
        const label = themeOptions.find(o => o.id === themeId)?.label ?? themeId;
        setAnnouncement(`Theme changed to ${label}`);
    }, [setTheme]);

    const handleColorSchemeSelect = useCallback((pref: ColorSchemePreference) => {
        setColorScheme(pref);
        const label = colorSchemeOptions.find(o => o.value === pref)?.label ?? pref;
        setAnnouncement(`Color scheme set to ${label}`);
    }, [setColorScheme]);

    // Keyboard navigation for theme radio group
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        let newIndex = focusedIndex;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            newIndex = (focusedIndex + 1) % themeOptions.length;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            newIndex = (focusedIndex - 1 + themeOptions.length) % themeOptions.length;
        } else if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            handleThemeSelect(themeOptions[focusedIndex].id);
            return;
        } else {
            return;
        }
        setFocusedIndex(newIndex);
        handleThemeSelect(themeOptions[newIndex].id);
    }, [focusedIndex, handleThemeSelect]);

    // Sync focused index when theme changes externally
    useEffect(() => {
        const idx = themeOptions.findIndex(o => o.id === theme);
        if (idx >= 0) setFocusedIndex(idx);
    }, [theme]);

    return (
        <div className="bg-app-surface border-2 border-app-border rounded-lg shadow-brutal-sm overflow-hidden">
            {/* Header */}
            <div className="bg-app-accent px-5 py-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <EyeIcon className="w-5 h-5 text-white" />
                    <h2 className="text-base font-bold text-white">Appearance</h2>
                </div>

                {/* Color Scheme Switcher (Light / Dark / System) */}
                <div className="flex items-center bg-black/20 rounded-lg p-0.5" role="radiogroup" aria-label="Color scheme">
                    {colorSchemeOptions.map(option => {
                        const isActive = colorScheme === option.value;
                        const Icon = option.icon;
                        return (
                            <button
                                key={option.value}
                                onClick={() => handleColorSchemeSelect(option.value)}
                                role="radio"
                                aria-checked={isActive}
                                aria-label={`${option.label} mode`}
                                className={`
                                    flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold
                                    transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white
                                    ${isActive
                                        ? 'bg-app-surface text-app-text shadow-sm'
                                        : 'text-white/80 hover:text-white hover:bg-app-surface/10'
                                    }
                                `}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{option.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Theme Grid */}
            <div
                ref={themeGridRef}
                className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
                role="radiogroup"
                aria-label="Select interface theme"
                onKeyDown={handleKeyDown}
            >
                {themeOptions.map((option, index) => {
                    const isActive = theme === option.id;
                    const isFocused = focusedIndex === index;
                    return (
                        <button
                            key={option.id}
                            onClick={() => handleThemeSelect(option.id)}
                            role="radio"
                            aria-checked={isActive}
                            aria-label={`${option.label} theme`}
                            tabIndex={isFocused ? 0 : -1}
                            className={`
                                relative group flex flex-col rounded-lg overflow-hidden
                                border-2 transition-all duration-200
                                focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2
                                ${isActive
                                    ? 'border-app-accent ring-2 ring-app-accent/30 scale-[1.02]'
                                    : 'border-app-border hover:border-app-accent/50 hover:shadow-md'
                                }
                            `}
                        >
                            {/* Mini Preview */}
                            <div
                                className="p-2.5 space-y-1.5"
                                style={{ backgroundColor: option.preview.bg }}
                            >
                                {/* Mini nav bar */}
                                <div
                                    className="h-2.5 rounded-sm"
                                    style={{
                                        backgroundColor: option.preview.surface,
                                        border: option.preview.borderStyle + ' ' + option.preview.border,
                                        borderWidth: '1px',
                                    }}
                                />
                                {/* Mini card with text lines */}
                                <div
                                    className="rounded-sm p-1.5 space-y-1"
                                    style={{
                                        backgroundColor: option.preview.surface,
                                        border: option.preview.borderStyle + ' ' + option.preview.border,
                                        borderWidth: '1px',
                                    }}
                                >
                                    <div
                                        className="h-1 w-3/4 rounded-full"
                                        style={{ backgroundColor: option.preview.text, opacity: 0.8 }}
                                    />
                                    <div
                                        className="h-1 w-1/2 rounded-full"
                                        style={{ backgroundColor: option.preview.text, opacity: 0.4 }}
                                    />
                                </div>
                                {/* Mini button */}
                                <div className="flex gap-1">
                                    <div
                                        className="h-2.5 flex-1 rounded-sm"
                                        style={{ backgroundColor: option.preview.accent }}
                                    />
                                    <div
                                        className="h-2.5 w-5 rounded-sm"
                                        style={{
                                            backgroundColor: 'transparent',
                                            border: '1px solid ' + option.preview.border,
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Label */}
                            <div className="px-2.5 py-2 text-center bg-app-surface-muted border-t border-app-border">
                                <span className="text-xs font-semibold text-app-text block leading-tight">
                                    {option.label}
                                </span>
                                <span className="text-[10px] text-app-text-subtle leading-tight">
                                    {option.description}
                                </span>
                            </div>

                            {/* Active Indicator */}
                            {isActive && (
                                <div className="absolute top-1.5 right-1.5 bg-app-accent text-white rounded-full p-0.5 shadow-sm">
                                    <CheckIcon className="w-3 h-3" strokeWidth={3} />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Screen reader announcement */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
                {announcement}
            </div>
        </div>
    );
}
