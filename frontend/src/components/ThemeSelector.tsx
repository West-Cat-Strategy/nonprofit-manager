<<<<<<< HEAD
import { useState } from 'react';
import { useTheme, type ColorSchemePreference } from '../contexts/ThemeContext';
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  CheckIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { THEME_IDS, THEME_REGISTRY, type ThemeId } from '../theme/themeRegistry';
import ThemePreviewSwatch from './theme/ThemePreviewSwatch';
import { classNames } from './ui/classNames';

const colorSchemeOptions: { value: ColorSchemePreference; label: string; icon: typeof SunIcon }[] =
  [
    { value: 'light', label: 'Light', icon: SunIcon },
    { value: 'dark', label: 'Dark', icon: MoonIcon },
    { value: 'system', label: 'System', icon: ComputerDesktopIcon },
  ];
=======
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme, type ColorSchemePreference } from '../contexts/ThemeContext';
import { SunIcon, MoonIcon, ComputerDesktopIcon, CheckIcon, EyeIcon } from '@heroicons/react/24/outline';
import { THEME_IDS, THEME_REGISTRY, type ThemeId } from '../theme/themeRegistry';
import ThemePreviewSwatch from './theme/ThemePreviewSwatch';

const colorSchemeOptions: { value: ColorSchemePreference; label: string; icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'System', icon: ComputerDesktopIcon },
];
>>>>>>> origin/main

export default function ThemeSelector() {
  const { theme, setTheme, colorScheme, setColorScheme } = useTheme();
  const [announcement, setAnnouncement] = useState('');
<<<<<<< HEAD

  const handleThemeSelect = (themeId: ThemeId) => {
    setTheme(themeId);
    setAnnouncement(`Theme changed to ${THEME_REGISTRY[themeId].label}`);
  };

  const handleColorSchemeSelect = (pref: ColorSchemePreference) => {
    setColorScheme(pref);
    const label = colorSchemeOptions.find((option) => option.value === pref)?.label ?? pref;
    setAnnouncement(`Color scheme set to ${label}`);
  };

  return (
    <div className="overflow-hidden rounded-[calc(var(--ui-radius-lg)+0.25rem)] border border-app-border bg-app-surface shadow-[var(--ui-elev-1)]">
      <div className="flex items-center justify-between gap-4 border-b border-app-border bg-app-surface-elevated/90 px-5 py-4">
        <div className="flex items-center gap-3">
          <EyeIcon className="h-5 w-5 text-app-accent" />
          <div>
            <h2 className="text-base font-semibold text-app-text-heading">Appearance</h2>
            <p className="text-xs text-app-text-muted">
              Choose the workspace mood and color scheme.
            </p>
=======
  const themeGridRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(() =>
    Math.max(
      0,
      THEME_IDS.findIndex((candidate) => candidate === theme)
    )
  );

  const handleThemeSelect = useCallback(
    (themeId: ThemeId) => {
      setTheme(themeId);
      const label = THEME_REGISTRY[themeId].label;
      setAnnouncement(`Theme changed to ${label}`);
    },
    [setTheme]
  );

  const handleColorSchemeSelect = useCallback(
    (pref: ColorSchemePreference) => {
      setColorScheme(pref);
      const label = colorSchemeOptions.find((option) => option.value === pref)?.label ?? pref;
      setAnnouncement(`Color scheme set to ${label}`);
    },
    [setColorScheme]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let newIndex = focusedIndex;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        newIndex = (focusedIndex + 1) % THEME_IDS.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        newIndex = (focusedIndex - 1 + THEME_IDS.length) % THEME_IDS.length;
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleThemeSelect(THEME_IDS[focusedIndex]);
        return;
      } else {
        return;
      }
      setFocusedIndex(newIndex);
      handleThemeSelect(THEME_IDS[newIndex]);
    },
    [focusedIndex, handleThemeSelect]
  );

  useEffect(() => {
    const idx = THEME_IDS.findIndex((candidate) => candidate === theme);
    if (idx >= 0) setFocusedIndex(idx);
  }, [theme]);

  return (
    <div className="overflow-hidden rounded-[calc(var(--ui-radius-lg)+0.25rem)] border border-app-border bg-app-surface shadow-[var(--ui-elev-1)]">
      <div className="flex items-center justify-between gap-4 border-b border-app-border px-5 py-4 bg-app-surface-elevated/90">
        <div className="flex items-center gap-3">
          <EyeIcon className="w-5 h-5 text-app-accent" />
          <div>
            <h2 className="text-base font-semibold text-app-text-heading">Appearance</h2>
            <p className="text-xs text-app-text-muted">Choose the workspace mood and color scheme.</p>
>>>>>>> origin/main
          </div>
        </div>

        <div
          className="flex items-center rounded-[var(--ui-radius-md)] border border-app-border bg-app-surface p-0.5"
          role="radiogroup"
          aria-label="Color scheme"
        >
          {colorSchemeOptions.map((option) => {
            const isActive = colorScheme === option.value;
            const Icon = option.icon;
<<<<<<< HEAD
            const inputId = `color-scheme-${option.value}`;

            return (
              <label
                key={option.value}
                htmlFor={inputId}
                className={classNames(
                  'flex cursor-pointer items-center gap-1.5 rounded-[var(--ui-radius-sm)] px-3 py-1.5 text-xs font-semibold transition-colors focus-within:ring-2 focus-within:ring-app-accent focus-within:ring-offset-2',
                  isActive
                    ? 'bg-app-accent text-[var(--app-accent-foreground)]'
                    : 'text-app-text-muted hover:bg-app-hover hover:text-app-text'
                )}
              >
                <input
                  id={inputId}
                  type="radio"
                  name="color-scheme"
                  className="sr-only"
                  checked={isActive}
                  onChange={() => handleColorSchemeSelect(option.value)}
                />
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{option.label}</span>
              </label>
=======
            return (
              <button
                key={option.value}
                onClick={() => handleColorSchemeSelect(option.value)}
                role="radio"
                aria-checked={isActive}
                aria-label={`${option.label} mode`}
                className={`flex items-center gap-1.5 rounded-[var(--ui-radius-sm)] px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent ${
                  isActive
                    ? 'bg-app-accent text-[var(--app-accent-foreground)]'
                    : 'text-app-text-muted hover:bg-app-hover hover:text-app-text'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{option.label}</span>
              </button>
>>>>>>> origin/main
            );
          })}
        </div>
      </div>

<<<<<<< HEAD
      <div className="grid grid-cols-2 gap-4 p-5 xl:grid-cols-3" role="radiogroup" aria-label="Select interface theme">
        {THEME_IDS.map((themeId) => {
          const option = THEME_REGISTRY[themeId];
          const isActive = theme === themeId;
          const inputId = `theme-${themeId}`;

          return (
            <label
              key={themeId}
              htmlFor={inputId}
              data-theme-card={themeId}
              className={classNames(
                'theme-selector-card relative flex cursor-pointer flex-col overflow-hidden rounded-[calc(var(--ui-radius-lg)+0.125rem)] border bg-app-surface text-left transition-all duration-200 focus-within:ring-2 focus-within:ring-app-accent focus-within:ring-offset-2',
                isActive
                  ? 'border-app-accent shadow-[var(--ui-elev-2)] ring-2 ring-app-accent/20'
                  : 'border-app-border-muted hover:-translate-y-0.5 hover:border-app-accent/50 hover:shadow-[var(--ui-elev-1)]'
              )}
            >
              <input
                id={inputId}
                type="radio"
                name="theme"
                className="sr-only"
                checked={isActive}
                onChange={() => handleThemeSelect(themeId)}
              />
=======
      <div
        ref={themeGridRef}
        className="grid grid-cols-2 gap-4 p-5 xl:grid-cols-3"
        role="radiogroup"
        aria-label="Select interface theme"
        onKeyDown={handleKeyDown}
      >
        {THEME_IDS.map((themeId, index) => {
          const option = THEME_REGISTRY[themeId];
          const isActive = theme === themeId;
          const isFocused = focusedIndex === index;
          return (
            <button
              key={themeId}
              onClick={() => handleThemeSelect(themeId)}
              role="radio"
              aria-checked={isActive}
              aria-label={`${option.label} theme`}
              tabIndex={isFocused ? 0 : -1}
              data-theme-card={themeId}
              className={`theme-selector-card relative flex flex-col overflow-hidden rounded-[calc(var(--ui-radius-lg)+0.125rem)] border bg-app-surface text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 ${
                isActive
                  ? 'border-app-accent shadow-[var(--ui-elev-2)] ring-2 ring-app-accent/20'
                  : 'border-app-border-muted hover:-translate-y-0.5 hover:border-app-accent/50 hover:shadow-[var(--ui-elev-1)]'
              }`}
            >
>>>>>>> origin/main
              <ThemePreviewSwatch themeId={themeId} size="card" className="w-full" />

              <div className="theme-selector-card__meta border-t border-app-border-muted bg-app-surface px-3.5 pb-3.5 pt-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="theme-selector-card__short inline-flex items-center rounded-full border border-app-border-muted bg-app-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-app-text-label">
                      {option.shortLabel}
                    </span>
                    <span className="theme-selector-card__label mt-2 block text-sm font-semibold leading-tight text-app-text-heading">
                      {option.label}
                    </span>
                  </div>

                  {isActive ? (
                    <div className="mt-0.5 rounded-full bg-app-accent p-1 text-[var(--app-accent-foreground)] shadow-sm">
                      <CheckIcon className="h-3 w-3" strokeWidth={3} />
                    </div>
                  ) : null}
                </div>

                <p className="theme-selector-card__description mt-2 text-[11px] leading-relaxed text-app-text-muted">
                  {option.description}
                </p>
              </div>
<<<<<<< HEAD
            </label>
=======
            </button>
>>>>>>> origin/main
          );
        })}
      </div>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
