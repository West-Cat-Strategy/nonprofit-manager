import { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme, type ColorSchemePreference } from '../contexts/ThemeContext';
import { SunIcon, MoonIcon, ComputerDesktopIcon, CheckIcon, EyeIcon } from '@heroicons/react/24/outline';
import { THEME_IDS, THEME_REGISTRY, type ThemeId } from '../theme/themeRegistry';

const colorSchemeOptions: { value: ColorSchemePreference; label: string; icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'System', icon: ComputerDesktopIcon },
];

const borderStyleClass: Record<string, string> = {
  solid: 'border-solid',
  dashed: 'border-dashed',
  dotted: 'border-dotted',
  double: 'border-double',
};

export default function ThemeSelector() {
  const { theme, setTheme, colorScheme, setColorScheme } = useTheme();
  const [announcement, setAnnouncement] = useState('');
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
    <div className="rounded-2xl border border-app-border bg-app-surface shadow-md overflow-hidden">
      <div className="bg-app-surface-elevated px-5 py-3 flex justify-between items-center border-b border-app-border">
        <div className="flex items-center gap-3">
          <EyeIcon className="w-5 h-5 text-app-accent" />
          <h2 className="text-base font-semibold text-app-text-heading">Appearance</h2>
        </div>

        <div className="flex items-center rounded-xl border border-app-border bg-app-surface p-0.5" role="radiogroup" aria-label="Color scheme">
          {colorSchemeOptions.map((option) => {
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
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                  transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent
                  ${
                    isActive
                      ? 'bg-app-accent text-white'
                      : 'text-app-text-muted hover:text-app-text hover:bg-app-hover'
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

      <div
        ref={themeGridRef}
        className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
        role="radiogroup"
        aria-label="Select interface theme"
        onKeyDown={handleKeyDown}
      >
        {THEME_IDS.map((themeId, index) => {
          const option = THEME_REGISTRY[themeId];
          const isActive = theme === themeId;
          const isFocused = focusedIndex === index;
          const previewBorderClass = borderStyleClass[option.preview.borderStyle] || 'border-solid';
          return (
            <button
              key={themeId}
              onClick={() => handleThemeSelect(themeId)}
              role="radio"
              aria-checked={isActive}
              aria-label={`${option.label} theme`}
              tabIndex={isFocused ? 0 : -1}
              className={`
                relative group flex flex-col rounded-xl overflow-hidden
                border transition-all duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2
                ${
                  isActive
                    ? 'border-app-accent ring-2 ring-app-accent/30'
                    : 'border-app-border hover:border-app-accent/50 hover:shadow-md'
                }
              `}
            >
              <div className="space-y-1.5 bg-app-surface-muted p-2.5">
                <div
                  className={`h-2.5 rounded-sm border border-app-border-muted bg-app-surface ${previewBorderClass}`}
                />
                <div
                  className={`space-y-1 rounded-sm border border-app-border-muted bg-app-surface p-1.5 ${previewBorderClass}`}
                >
                  <div className="h-1 w-3/4 rounded-full bg-app-text/80" />
                  <div className="h-1 w-1/2 rounded-full bg-app-text/45" />
                </div>
                <div className="flex gap-1">
                  <div className="h-2.5 flex-1 rounded-sm bg-app-accent" />
                  <div
                    className={`h-2.5 w-5 rounded-sm border border-app-border-muted bg-transparent ${previewBorderClass}`}
                  />
                </div>
              </div>

              <div className="px-2.5 py-2 text-center bg-app-surface-muted border-t border-app-border">
                <span className="text-xs font-semibold text-app-text block leading-tight">{option.label}</span>
                <span className="text-[10px] text-app-text-subtle leading-tight">{option.description}</span>
              </div>

              {isActive && (
                <div className="absolute top-1.5 right-1.5 bg-app-accent text-white rounded-full p-0.5 shadow-sm">
                  <CheckIcon className="w-3 h-3" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
