import type { ReactElement } from 'react';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { expect, vi } from 'vitest';
import { renderWithProviders } from './testUtils';
import type { RootState } from '../store';

export type RouteActionRole = Parameters<typeof screen.findAllByRole>[0];

export type RouteUxCase = {
  name: string;
  route: string;
  path?: string;
  page: ReactElement;
  heading: string | RegExp;
  primaryActionPattern: RegExp;
  primaryActionRole?: RouteActionRole;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  requireMainLandmark?: boolean;
  preloadedState?: Partial<RootState>;
  contractAssertion?: () => Promise<void> | void;
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
  preloadedState,
  contractAssertion,
}: RouteUxCase): Promise<void> {
  renderWithProviders(
    path ? (
      <Routes>
        <Route path={path} element={page} />
      </Routes>
    ) : (
      page
    ),
    { route, preloadedState }
  );

  if (requireMainLandmark) {
    expect(await screen.findByRole('main')).toBeInTheDocument();
  }

  expect(
    await screen.findByRole('heading', {
      name: heading,
      level: headingLevel,
    })
  ).toBeInTheDocument();

  const actions = await screen.findAllByRole(primaryActionRole, {
    name: primaryActionPattern,
  });
  expect(actions.length).toBeGreaterThan(0);

  await contractAssertion?.();
}
