import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ThemeAuditPage from '../ThemeAuditPage';
import { renderWithProviders } from '../../../../test/testUtils';

describe('ThemeAuditPage', () => {
  it('renders the primary action sample with accent foreground contrast tokens', () => {
    renderWithProviders(<ThemeAuditPage />, { route: '/theme-audit' });

    expect(screen.getByRole('button', { name: 'Primary action' })).toHaveClass(
      'text-[var(--app-accent-foreground)]'
    );
  });
});
