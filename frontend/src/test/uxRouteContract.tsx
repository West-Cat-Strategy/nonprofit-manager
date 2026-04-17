import type { ReactElement } from 'react';
import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { expect, vi } from 'vitest';
import { renderWithProviders } from './testUtils';

export type RouteUxCase = {
  name: string;
  route: string;
  path?: string;
  page: ReactElement;
  heading: string | RegExp;
  primaryActionPattern: RegExp;
  primaryActionRole?: 'button' | 'link';
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  requireMainLandmark?: boolean;
};

export const createConsoleErrorSpy = () =>
  vi.spyOn(console, 'error').mockImplementation(() => {});

export async function assertRouteUxContract({
  route,
  path,
  page,
  heading,
  primaryActionPattern,
  primaryActionRole = 'button',
  headingLevel = 1,
  requireMainLandmark = false,
}: RouteUxCase): Promise<void> {
  renderWithProviders(
    path ? (
      <Routes>
        <Route path={path} element={page} />
      </Routes>
    ) : (
      page
    ),
    { route }
  );

  await waitFor(() => {
    if (requireMainLandmark) {
      expect(screen.getByRole('main')).toBeInTheDocument();
    }
    expect(screen.getByRole('heading', { name: heading, level: headingLevel })).toBeInTheDocument();
    expect(
      screen.getAllByRole(primaryActionRole, {
        name: primaryActionPattern,
      }).length
    ).toBeGreaterThan(0);
  });
}
