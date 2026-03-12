import { lazy } from 'react';

/**
 * MODULE-OWNERSHIP: finance route boundary
 *
 * Route components for finance routes must resolve through feature ownership.
 */

export const DonationList = lazy(() => import('./pages/DonationListPage'));
export const DonationDetail = lazy(() => import('./pages/DonationDetailPage'));
export const DonationCreate = lazy(() => import('./pages/DonationCreatePage'));
export const DonationEdit = lazy(() => import('./pages/DonationEditPage'));
export const DonationPayment = lazy(() => import('./pages/DonationPaymentPage'));
export const PaymentResult = lazy(() => import('./pages/PaymentResultPage'));
export const ReconciliationDashboard = lazy(() => import('./pages/ReconciliationDashboardPage'));
