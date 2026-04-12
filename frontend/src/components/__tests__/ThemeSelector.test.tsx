<<<<<<< HEAD
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
=======
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
>>>>>>> origin/main
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
<<<<<<< HEAD
    const corporateTheme = screen.getByRole('radio', { name: /disciplined cobalt accents/i });
    expect(corporateTheme.closest('label')).toHaveAttribute('data-theme-card', 'corporate');
    expect(corporateTheme.closest('label')?.querySelector('[data-theme-preview="corporate"]')).not.toBeNull();
=======
    const corporateTheme = screen.getByRole('radio', { name: /corporate theme/i });
    expect(corporateTheme).toHaveAttribute('data-theme-card', 'corporate');
    expect(within(corporateTheme).getAllByText('CP')).toHaveLength(2);
    expect(corporateTheme.querySelector('[data-theme-preview="corporate"]')).not.toBeNull();
>>>>>>> origin/main

    fireEvent.click(corporateTheme);

    await waitFor(() => expect(localStorage.getItem('app-theme')).toBe('corporate'));
    expect(document.body.classList.contains('theme-corporate')).toBe(true);
  });

<<<<<<< HEAD
  it('supports keyboard selection for theme and color scheme radios', async () => {
    const user = userEvent.setup();
=======
  it('supports color scheme toggle controls', async () => {
>>>>>>> origin/main
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

<<<<<<< HEAD
    const lightScheme = screen.getByRole('radio', { name: /^light$/i });
    lightScheme.focus();
    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(localStorage.getItem('app-color-scheme')).toBe('dark'));
    expect(document.body.classList.contains('dark')).toBe(true);

    const themeRadio = screen.getByRole('radio', { name: /ink-first hierarchy/i });
    themeRadio.focus();
    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(localStorage.getItem('app-theme')).toBe('sea-breeze'));
=======
    fireEvent.click(screen.getByRole('radio', { name: /dark mode/i }));
    await waitFor(() => expect(localStorage.getItem('app-color-scheme')).toBe('dark'));
    expect(document.body.classList.contains('dark')).toBe(true);
>>>>>>> origin/main
  });
});
