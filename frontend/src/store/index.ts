import { combineReducers, configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import accountsReducer from './slices/accountsSlice';
import volunteersReducer from './slices/volunteersSlice';
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
import dashboardReducer from './slices/dashboardSlice';
import alertsReducer from './slices/alertsSlice';
import portalAuthReducer from './slices/portalAuthSlice';
import followUpsReducer from './slices/followUpsSlice';
import outcomesAdminReducer from './slices/outcomesAdminSlice';
import outcomesReportsReducer from './slices/outcomesReportsSlice';
import casesV2Reducer from '../features/cases/state/casesLegacyCore';
import contactsV2Reducer from '../features/contacts/state/contactsLegacyCore';
import {
  eventAutomationV2Reducer,
  eventDetailV2Reducer,
  eventMutationV2Reducer,
  eventRegistrationV2Reducer,
  eventRemindersV2Reducer,
  eventsListV2Reducer,
} from '../features/events/state';

export const rootReducer = combineReducers({
  auth: authReducer,
  accounts: accountsReducer,
  contactsV2: contactsV2Reducer,
  volunteers: volunteersReducer,
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
  casesV2: casesV2Reducer,
  dashboard: dashboardReducer,
  alerts: alertsReducer,
  portalAuth: portalAuthReducer,
  followUps: followUpsReducer,
  outcomesAdmin: outcomesAdminReducer,
  outcomesReports: outcomesReportsReducer,
  eventsListV2: eventsListV2Reducer,
  eventDetailV2: eventDetailV2Reducer,
  eventRegistrationV2: eventRegistrationV2Reducer,
  eventRemindersV2: eventRemindersV2Reducer,
  eventMutationV2: eventMutationV2Reducer,
  eventAutomationV2: eventAutomationV2Reducer,
});

export const store = configureStore({
  reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
