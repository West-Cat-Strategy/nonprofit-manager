import { combineReducers, configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/state';
import accountsReducer from '../features/accounts/state';
import volunteersReducer from '../features/volunteers/state';
import tasksReducer from '../features/tasks/state';
import opportunitiesReducer from '../features/engagement/opportunities/state';
import analyticsReducer from '../features/analytics/state';
import dashboardReducer from '../features/dashboard/state';
import followUpsReducer from '../features/followUps/state';
import mailchimpReducer from '../features/mailchimp/state';
import webhooksReducer from '../features/webhooks/state';
import alertsReducer from '../features/alerts/state';
import portalAuthReducer from '../features/portalAuth/state';
import financeReducer from '../features/finance/state';
import templateReducer from '../features/builder/state';
import casesReducer from '../features/cases/state';
import contactsReducer from '../features/contacts/state';
import {
  outcomesAdminReducer,
  outcomesReportsReducer,
} from '../features/outcomes/state';
import websitesReducer from '../features/websites/state';
import eventsReducer from '../features/events/state';
import socialMediaReducer from '../features/socialMedia/state';

export const rootReducer = combineReducers({
  auth: authReducer,
  accounts: accountsReducer,
  contacts: contactsReducer,
  volunteers: volunteersReducer,
  finance: financeReducer,
  tasks: tasksReducer,
  analytics: analyticsReducer,
  mailchimp: mailchimpReducer,
  webhooks: webhooksReducer,
  templates: templateReducer,
  cases: casesReducer,
  dashboard: dashboardReducer,
  alerts: alertsReducer,
  portalAuth: portalAuthReducer,
  websites: websitesReducer,
  socialMedia: socialMediaReducer,
  followUps: followUpsReducer,
  opportunities: opportunitiesReducer,
  outcomesAdmin: outcomesAdminReducer,
  outcomesReports: outcomesReportsReducer,
  events: eventsReducer,
});

export const store = configureStore({
  reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
