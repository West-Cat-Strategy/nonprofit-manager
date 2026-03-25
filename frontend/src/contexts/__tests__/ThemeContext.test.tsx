import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme } from '../ThemeContext';

function ThemeProbe() {
  const { theme, setTheme, isDarkMode, setColorScheme } = useTheme();
  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="dark">{String(isDarkMode)}</div>
      <button type="button" onClick={() => setTheme('glass')}>
        set-glass
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
    vi.restoreAllMocks();
  });

  it('hydrates theme/scheme from storage and applies body classes', async () => {
    localStorage.setItem('app-theme', 'corporate');
    localStorage.setItem('app-color-scheme', 'dark');
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme').textContent).toBe('corporate');
    expect(screen.getByTestId('dark').textContent).toBe('true');
    await waitFor(() => expect(document.body.classList.contains('theme-corporate')).toBe(true));
    expect(document.body.classList.contains('dark')).toBe(true);
    expect(document.body.classList.contains('ui-redesign')).toBe(false);
  });

  it('updates theme and color scheme via context actions', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'set-glass' }));
    fireEvent.click(screen.getByRole('button', { name: 'set-light' }));

    await waitFor(() => expect(localStorage.getItem('app-theme')).toBe('glass'));
    expect(localStorage.getItem('app-color-scheme')).toBe('light');
    expect(document.body.classList.contains('theme-glass')).toBe(true);
    expect(document.body.classList.contains('dark')).toBe(false);
    expect(document.body.classList.contains('ui-redesign')).toBe(false);
  });
});
