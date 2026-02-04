/**
 * Finance Routes
 * Handles donations and reconciliation
 */

import { lazy, ReactNode } from 'react';
import { Route } from 'react-router-dom';

// Lazy load donation pages
const DonationList = lazy(() => import('../pages/finance/donations/DonationList'));
const DonationDetail = lazy(() => import('../pages/finance/donations/DonationDetail'));
const DonationCreate = lazy(() => import('../pages/finance/donations/DonationCreate'));
const DonationEdit = lazy(() => import('../pages/finance/donations/DonationEdit'));
const DonationPayment = lazy(() => import('../pages/finance/donations/DonationPayment'));
const PaymentResult = lazy(() => import('../pages/finance/donations/PaymentResult'));

// Lazy load reconciliation pages
const ReconciliationDashboard = lazy(() => import('../pages/finance/reconciliation/ReconciliationDashboard'));

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

// Re-export lazy components for backwards compatibility
export {
  DonationList,
  DonationDetail,
  DonationCreate,
  DonationEdit,
  DonationPayment,
  PaymentResult,
  ReconciliationDashboard,
};
