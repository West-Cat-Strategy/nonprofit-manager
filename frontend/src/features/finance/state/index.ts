import { combineReducers } from '@reduxjs/toolkit';
import donationsReducer from './donationsCore';
import recurringDonationsReducer from './recurringDonationsCore';
import paymentsReducer from './paymentsCore';
import reconciliationReducer from './reconciliationCore';
import type { RootState } from '../../../store';

const financeReducer = combineReducers({
  donations: donationsReducer,
  recurring: recurringDonationsReducer,
  payments: paymentsReducer,
  reconciliation: reconciliationReducer,
});

export default financeReducer;

export * from './donationsCore';
export * from './recurringDonationsCore';
export * from './paymentsCore';
export {
  assignDiscrepancy,
  clearCurrentReconciliation,
  clearError as clearReconciliationError,
  createReconciliation,
  fetchAllDiscrepancies,
  fetchReconciliationById,
  fetchReconciliationDashboard,
  fetchReconciliationDiscrepancies,
  fetchReconciliations,
  fetchReconciliationItems,
  manualMatchTransaction,
  resolveDiscrepancy,
} from './reconciliationCore';

// Selectors
export const selectDonations = (state: RootState) => state.finance.donations;
export const selectRecurringDonations = (state: RootState) => state.finance.recurring;
export const selectPayments = (state: RootState) => state.finance.payments;
export const selectReconciliation = (state: RootState) => state.finance.reconciliation;
