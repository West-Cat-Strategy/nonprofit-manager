/**
 * People Routes
 * Handles accounts, contacts, and volunteers
 */

import type { ReactNode } from 'react';
import { Route } from 'react-router-dom';
import {
  authenticatedPeopleRouteDescriptors,
  publicPeopleRouteDescriptors,
} from './peopleRouteDescriptors';

interface RouteWrapperProps {
  children: ReactNode;
}

const renderDescriptorRoutes = (
  ProtectedRoute: React.ComponentType<RouteWrapperProps>,
  descriptors: readonly (typeof authenticatedPeopleRouteDescriptors)[number][]
) =>
  descriptors.map((descriptor) => (
    <Route
      key={descriptor.catalog.id}
      path={descriptor.catalog.path}
      element={<ProtectedRoute>{descriptor.render()}</ProtectedRoute>}
    />
  ));

export function createPeopleRoutes(ProtectedRoute: React.ComponentType<RouteWrapperProps>) {
  return (
    <>{renderDescriptorRoutes(ProtectedRoute, authenticatedPeopleRouteDescriptors)}</>
  );
}

export function createStandalonePeopleRoutes(ProtectedRoute: React.ComponentType<RouteWrapperProps>) {
  return <>{renderDescriptorRoutes(ProtectedRoute, publicPeopleRouteDescriptors)}</>;
}
