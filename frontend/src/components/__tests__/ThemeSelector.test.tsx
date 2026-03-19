import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ThemeSelector from '../ThemeSelector';
import { ThemeProvider } from '../../contexts/ThemeContext';

describe('ThemeSelector', () => {
  afterEach(() => {
    localStorage.clear();
    document.body.className = '';
    vi.restoreAllMocks();
  });

  it('renders selector controls and updates theme selection', async () => {
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
        <ThemeSelector />
      </ThemeProvider>
    );

    expect(screen.getByRole('radiogroup', { name: /select interface theme/i })).toBeInTheDocument();
    const corporateTheme = screen.getByRole('radio', { name: /corporate theme/i });
    expect(corporateTheme).toHaveAttribute('data-theme-card', 'corporate');
    expect(within(corporateTheme).getAllByText('CP')).toHaveLength(2);
    expect(corporateTheme.querySelector('[data-theme-preview="corporate"]')).not.toBeNull();

    fireEvent.click(corporateTheme);

    await waitFor(() => expect(localStorage.getItem('app-theme')).toBe('corporate'));
    expect(document.body.classList.contains('theme-corporate')).toBe(true);
  });

  it('supports color scheme toggle controls', async () => {
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
        <ThemeSelector />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('radio', { name: /dark mode/i }));
    await waitFor(() => expect(localStorage.getItem('app-color-scheme')).toBe('dark'));
    expect(document.body.classList.contains('dark')).toBe(true);
  });
});
