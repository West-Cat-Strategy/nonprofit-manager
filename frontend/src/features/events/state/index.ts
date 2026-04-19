import { combineReducers } from '@reduxjs/toolkit';
import listReducer from './eventsListSlice';
import detailReducer from './eventDetailSlice';
import registrationReducer from './eventRegistrationSlice';
import remindersReducer from './eventRemindersSlice';
import mutationReducer from './eventMutationSlice';
import automationReducer from './eventAutomationSlice';
import type { RootState } from '../../../store';

const eventsReducer = combineReducers({
  list: listReducer,
  detail: detailReducer,
  registration: registrationReducer,
  reminders: remindersReducer,
  mutation: mutationReducer,
  automation: automationReducer,
});

export default eventsReducer;

export * from './eventsListSlice';
export * from './eventDetailSlice';
export * from './eventRegistrationSlice';
export * from './eventRemindersSlice';
export * from './eventMutationSlice';
export * from './eventAutomationSlice';

// Selectors
export const selectEventsList = (state: RootState) => state.events.list;
export const selectEventDetail = (state: RootState) => state.events.detail;
export const selectEventRegistration = (state: RootState) => state.events.registration;
export const selectEventReminders = (state: RootState) => state.events.reminders;
export const selectEventAutomation = (state: RootState) => state.events.automation;
