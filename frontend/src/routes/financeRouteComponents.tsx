import { lazy } from 'react';

export const DonationList = lazy(() => import('../pages/finance/donations/DonationList'));
export const DonationDetail = lazy(() => import('../pages/finance/donations/DonationDetail'));
export const DonationCreate = lazy(() => import('../pages/finance/donations/DonationCreate'));
export const DonationEdit = lazy(() => import('../pages/finance/donations/DonationEdit'));
export const DonationPayment = lazy(() => import('../pages/finance/donations/DonationPayment'));
export const PaymentResult = lazy(() => import('../pages/finance/donations/PaymentResult'));
export const ReconciliationDashboard = lazy(() => import('../pages/finance/reconciliation/ReconciliationDashboard'));
