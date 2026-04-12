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
import {
  donationsReducer,
  paymentsReducer,
  recurringDonationsReducer,
  reconciliationReducer,
} from '../features/finance/state';
import templateReducer from '../features/builder/state';
import casesReducer from '../features/cases/state';
import contactsReducer from '../features/contacts/state';
import {
  outcomesAdminReducer,
  outcomesReportsReducer,
} from '../features/outcomes/state';
import websitesReducer from '../features/websites/state';
import {
  eventAutomationReducer,
  eventDetailReducer,
  eventMutationReducer,
  eventRegistrationReducer,
  eventRemindersReducer,
  eventsListReducer,
} from '../features/events/state';
import socialMediaReducer from '../features/socialMedia/state';

export const rootReducer = combineReducers({
  auth: authReducer,
  accounts: accountsReducer,
  contacts: contactsReducer,
<<<<<<< HEAD
  volunteers: volunteersReducer,
  donations: donationsReducer,
  recurringDonations: recurringDonationsReducer,
  tasks: tasksReducer,
  analytics: analyticsReducer,
=======
  contactsV2: contactsReducer,
  volunteers: volunteersReducer,
  volunteersV2: volunteersReducer,
  donations: donationsReducer,
  recurringDonations: recurringDonationsReducer,
  tasks: tasksReducer,
  tasksV2: tasksReducer,
  analytics: analyticsReducer,
  analyticsV2: analyticsReducer,
>>>>>>> origin/main
  payments: paymentsReducer,
  reconciliation: reconciliationReducer,
  mailchimp: mailchimpReducer,
  webhooks: webhooksReducer,
  templates: templateReducer,
  cases: casesReducer,
<<<<<<< HEAD
  dashboard: dashboardReducer,
=======
  casesV2: casesReducer,
  dashboard: dashboardReducer,
  dashboardV2: dashboardReducer,
>>>>>>> origin/main
  alerts: alertsReducer,
  portalAuth: portalAuthReducer,
  websites: websitesReducer,
  socialMedia: socialMediaReducer,
  followUps: followUpsReducer,
<<<<<<< HEAD
=======
  followUpsV2: followUpsReducer,
>>>>>>> origin/main
  opportunities: opportunitiesReducer,
  outcomesAdmin: outcomesAdminReducer,
  outcomesReports: outcomesReportsReducer,
  eventsList: eventsListReducer,
<<<<<<< HEAD
  eventDetail: eventDetailReducer,
  eventRegistration: eventRegistrationReducer,
  eventReminders: eventRemindersReducer,
  eventMutation: eventMutationReducer,
  eventAutomation: eventAutomationReducer,
=======
  eventsListV2: eventsListReducer,
  eventDetail: eventDetailReducer,
  eventDetailV2: eventDetailReducer,
  eventRegistration: eventRegistrationReducer,
  eventRegistrationV2: eventRegistrationReducer,
  eventReminders: eventRemindersReducer,
  eventRemindersV2: eventRemindersReducer,
  eventMutation: eventMutationReducer,
  eventMutationV2: eventMutationReducer,
  eventAutomation: eventAutomationReducer,
  eventAutomationV2: eventAutomationReducer,
>>>>>>> origin/main
});

export const store = configureStore({
  reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
