import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import accountsReducer from './slices/accountsSlice';
import contactsReducer from './slices/contactsSlice';
import volunteersReducer from './slices/volunteersSlice';
import eventsReducer from './slices/eventsSlice';
import donationsReducer from './slices/donationsSlice';
import tasksReducer from './slices/tasksSlice';
import analyticsReducer from './slices/analyticsSlice';
import reportsReducer from './slices/reportsSlice';
import savedReportsReducer from './slices/savedReportsSlice';
import paymentsReducer from './slices/paymentsSlice';
import reconciliationReducer from './slices/reconciliationSlice';
import mailchimpReducer from './slices/mailchimpSlice';
import webhooksReducer from './slices/webhookSlice';
import templatesReducer from './slices/templateSlice';
import casesReducer from './slices/casesSlice';
import dashboardReducer from './slices/dashboardSlice';
import alertsReducer from './slices/alertsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    accounts: accountsReducer,
    contacts: contactsReducer,
    volunteers: volunteersReducer,
    events: eventsReducer,
    donations: donationsReducer,
    tasks: tasksReducer,
    analytics: analyticsReducer,
    reports: reportsReducer,
    savedReports: savedReportsReducer,
    payments: paymentsReducer,
    reconciliation: reconciliationReducer,
    mailchimp: mailchimpReducer,
    webhooks: webhooksReducer,
    templates: templatesReducer,
    cases: casesReducer,
    dashboard: dashboardReducer,
    alerts: alertsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
