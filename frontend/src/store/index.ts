import { combineReducers, configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/state';
import accountsV2Reducer from '../features/accounts/state';
import volunteersV2Reducer from '../features/volunteers/state';
import tasksV2Reducer from '../features/tasks/state';
import opportunitiesReducer from '../features/engagement/opportunities/state';
import analyticsV2Reducer from '../features/analytics/state';
import reportsV2Reducer from '../features/reports/state';
import savedReportsV2Reducer from '../features/savedReports/state';
import scheduledReportsV2Reducer from '../features/scheduledReports/state';
import dashboardV2Reducer from '../features/dashboard/state';
import followUpsV2Reducer from '../features/followUps/state';
import mailchimpReducer from '../features/mailchimp/state';
import webhooksReducer from '../features/webhooks/state';
import alertsReducer from '../features/alerts/state';
import portalAuthReducer from '../features/portalAuth/state';
import {
  donationsReducer,
  paymentsReducer,
  recurringDonationsReducer,
  reconciliationReducer,
} from '../features/finance/state';
import templateReducer from '../features/builder/state';
import casesV2Reducer from '../features/cases/state';
import contactsV2Reducer from '../features/contacts/state';
import {
  outcomesAdminReducer,
  outcomesReportsReducer,
} from '../features/outcomes/state';
import websitesReducer from '../features/websites/state';
import {
  eventAutomationV2Reducer,
  eventDetailV2Reducer,
  eventMutationV2Reducer,
  eventRegistrationV2Reducer,
  eventRemindersV2Reducer,
  eventsListV2Reducer,
} from '../features/events/state';
import socialMediaReducer from '../features/socialMedia/state';

export const rootReducer = combineReducers({
  auth: authReducer,
  accounts: accountsV2Reducer,
  contactsV2: contactsV2Reducer,
  volunteers: volunteersV2Reducer,
  donations: donationsReducer,
  recurringDonations: recurringDonationsReducer,
  tasks: tasksV2Reducer,
  analytics: analyticsV2Reducer,
  reports: reportsV2Reducer,
  savedReports: savedReportsV2Reducer,
  payments: paymentsReducer,
  reconciliation: reconciliationReducer,
  mailchimp: mailchimpReducer,
  webhooks: webhooksReducer,
  templates: templateReducer,
  casesV2: casesV2Reducer,
  dashboard: dashboardV2Reducer,
  alerts: alertsReducer,
  portalAuth: portalAuthReducer,
  websites: websitesReducer,
  socialMedia: socialMediaReducer,
  followUps: followUpsV2Reducer,
  scheduledReports: scheduledReportsV2Reducer,
  opportunities: opportunitiesReducer,
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
