import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme } from '../ThemeContext';

type MatchMediaConfig = {
  dark?: boolean;
  reducedMotion?: boolean;
};

function installMatchMedia({ dark = false, reducedMotion = false }: MatchMediaConfig = {}) {
  const listeners = new Map<string, Set<(event: MediaQueryListEvent) => void>>();

  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => {
      const matches =
        query === '(prefers-color-scheme: dark)'
          ? dark
          : query === '(prefers-reduced-motion: reduce)'
            ? reducedMotion
            : false;

      return {
        matches,
        media: query,
        onchange: null,
        addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
          const existing = listeners.get(query) ?? new Set();
          existing.add(listener);
          listeners.set(query, existing);
        },
        removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
          listeners.get(query)?.delete(listener);
        },
        dispatchEvent: vi.fn(),
      };
    })
  );

  return {
    emit(query: '(prefers-color-scheme: dark)' | '(prefers-reduced-motion: reduce)', matches: boolean) {
      listeners.get(query)?.forEach((listener) =>
        listener({ matches, media: query } as MediaQueryListEvent)
      );
    },
  };
}

function ThemeProbe() {
  const { theme, setTheme, isDarkMode, setColorScheme } = useTheme();
  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="dark">{String(isDarkMode)}</div>
      <button type="button" onClick={() => setTheme('glass')}>
        set-glass
      </button>
      <button type="button" onClick={() => setTheme('corporate')}>
        set-corporate
      </button>
      <button type="button" onClick={() => setColorScheme('light')}>
        set-light
      </button>
    </div>
  );
}

describe('ThemeContext', () => {
  afterEach(() => {
    localStorage.clear();
    document.body.className = '';
    document.documentElement.className = '';
    document.documentElement.style.colorScheme = '';
    document
      .querySelectorAll('link[data-managed-theme-link="true"], #app-theme-stylesheet')
      .forEach((node) => node.remove());
    vi.restoreAllMocks();
  });

  it('hydrates theme/scheme from storage, cleans stale classes, and syncs browser color-scheme', async () => {
    localStorage.setItem('app-theme', 'corporate');
    localStorage.setItem('app-color-scheme', 'dark');
    document.body.classList.add('theme-glass');
    installMatchMedia({ dark: true });

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme').textContent).toBe('corporate');
    expect(screen.getByTestId('dark').textContent).toBe('true');
    await waitFor(() => expect(document.body.classList.contains('theme-corporate')).toBe(true));
    expect(document.body.classList.contains('theme-glass')).toBe(false);
    expect(document.body.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('reuses a single managed theme stylesheet link and updates theme classes', async () => {
    installMatchMedia();

    const duplicateLink = document.createElement('link');
    duplicateLink.setAttribute('data-managed-theme-link', 'true');
    duplicateLink.href = '/themes/old.css';
    document.head.appendChild(duplicateLink);

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'set-corporate' }));
    await waitFor(() => expect(document.body.classList.contains('theme-corporate')).toBe(true));

    fireEvent.click(screen.getByRole('button', { name: 'set-glass' }));
    fireEvent.click(screen.getByRole('button', { name: 'set-light' }));

    await waitFor(() => expect(localStorage.getItem('app-theme')).toBe('glass'));
    expect(localStorage.getItem('app-color-scheme')).toBe('light');
    expect(document.body.classList.contains('theme-glass')).toBe(true);
    expect(document.body.classList.contains('theme-corporate')).toBe(false);
    expect(document.body.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');

    const managedLinks = document.querySelectorAll('link[data-managed-theme-link="true"]');
    expect(managedLinks).toHaveLength(1);
    expect(managedLinks[0]).toHaveAttribute('id', 'app-theme-stylesheet');
    expect(managedLinks[0]).toHaveAttribute('href', '/themes/glass.css');
  });

  it('disables theme transition classes when reduced motion is preferred', async () => {
    const media = installMatchMedia({ reducedMotion: true });

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'set-glass' }));

    await waitFor(() => expect(document.body.classList.contains('theme-glass')).toBe(true));
    expect(document.body.classList.contains('theme-transitioning')).toBe(false);

    media.emit('(prefers-reduced-motion: reduce)', false);
    fireEvent.click(screen.getByRole('button', { name: 'set-corporate' }));

    await waitFor(() => expect(document.body.classList.contains('theme-corporate')).toBe(true));
    expect(document.body.classList.contains('theme-transitioning')).toBe(true);
  });
});
