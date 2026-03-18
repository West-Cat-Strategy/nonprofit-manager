/**
 * Finance Routes
 * Handles donations and reconciliation
 */

import type { ReactNode } from 'react';
import { Route } from 'react-router-dom';
import {
  DonationList,
  DonationDetail,
  DonationCreate,
  DonationEdit,
  RecurringDonationList,
  RecurringDonationDetail,
  RecurringDonationEdit,
  DonationPayment,
  PaymentResult,
  ReconciliationDashboard,
} from '../features/finance/routeComponents';

// Lazy load donation pages

// Lazy load reconciliation pages

interface RouteWrapperProps {
  children: ReactNode;
}

export function createFinanceRoutes(ProtectedRoute: React.ComponentType<RouteWrapperProps>) {
  return (
    <>
      {/* Donation Routes */}
      <Route
        path="/donations"
        element={<ProtectedRoute><DonationList /></ProtectedRoute>}
      />
      <Route
        path="/donations/new"
        element={<ProtectedRoute><DonationCreate /></ProtectedRoute>}
      />
      <Route
        path="/donations/:id/edit"
        element={<ProtectedRoute><DonationEdit /></ProtectedRoute>}
      />
      <Route
        path="/donations/:id"
        element={<ProtectedRoute><DonationDetail /></ProtectedRoute>}
      />
      <Route
        path="/recurring-donations"
        element={<ProtectedRoute><RecurringDonationList /></ProtectedRoute>}
      />
      <Route
        path="/recurring-donations/:id"
        element={<ProtectedRoute><RecurringDonationDetail /></ProtectedRoute>}
      />
      <Route
        path="/recurring-donations/:id/edit"
        element={<ProtectedRoute><RecurringDonationEdit /></ProtectedRoute>}
      />
      <Route
        path="/donations/payment"
        element={<ProtectedRoute><DonationPayment /></ProtectedRoute>}
      />
      <Route
        path="/donations/payment-result"
        element={<ProtectedRoute><PaymentResult /></ProtectedRoute>}
      />

      {/* Reconciliation Routes */}
      <Route
        path="/reconciliation"
        element={<ProtectedRoute><ReconciliationDashboard /></ProtectedRoute>}
      />
    </>
  );
}
