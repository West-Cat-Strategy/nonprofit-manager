import { combineReducers } from '@reduxjs/toolkit';
import donationsReducer from './donationsCore';
import recurringDonationsReducer from './recurringDonationsCore';
import paymentsReducer from './paymentsCore';
import reconciliationReducer from './reconciliationCore';

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
export const selectDonations = (state: any) => state.finance.donations;
export const selectRecurringDonations = (state: any) => state.finance.recurring;
export const selectPayments = (state: any) => state.finance.payments;
export const selectReconciliation = (state: any) => state.finance.reconciliation;
