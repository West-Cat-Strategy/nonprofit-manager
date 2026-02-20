import type { ReactElement } from 'react';
import { screen, waitFor } from '@testing-library/react';
import { expect, vi } from 'vitest';
import { renderWithProviders } from './testUtils';

export type RouteUxCase = {
  name: string;
  route: string;
  page: ReactElement;
  heading: string | RegExp;
  primaryActionPattern: RegExp;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
};

export const createConsoleErrorSpy = () =>
  vi.spyOn(console, 'error').mockImplementation(() => {});

export async function assertRouteUxContract({
  route,
  page,
  heading,
  primaryActionPattern,
  headingLevel = 1,
}: RouteUxCase): Promise<void> {
  renderWithProviders(page, { route });

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: heading, level: headingLevel })).toBeInTheDocument();
  });

  expect(
    screen.getAllByRole('button', {
      name: primaryActionPattern,
    }).length
  ).toBeGreaterThan(0);
}
