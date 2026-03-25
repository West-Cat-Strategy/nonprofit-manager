export { default as eventsListReducer } from './eventsListSlice';
export { default as eventDetailReducer } from './eventDetailSlice';
export { default as eventRegistrationReducer } from './eventRegistrationSlice';
export { default as eventRemindersReducer } from './eventRemindersSlice';
export { default as eventMutationReducer } from './eventMutationSlice';
export { default as eventAutomationReducer } from './eventAutomationSlice';

export { default as eventsListV2Reducer } from './eventsListSlice';
export { default as eventDetailV2Reducer } from './eventDetailSlice';
export { default as eventRegistrationV2Reducer } from './eventRegistrationSlice';
export { default as eventRemindersV2Reducer } from './eventRemindersSlice';
export { default as eventMutationV2Reducer } from './eventMutationSlice';
export { default as eventAutomationV2Reducer } from './eventAutomationSlice';

export { fetchEventsListV2, fetchEventsListV2 as fetchEventsList } from './eventsListSlice';
export { fetchEventDetailV2, fetchEventDetailV2 as fetchEventDetail } from './eventDetailSlice';
export {
  cancelEventRegistrationV2,
  cancelEventRegistrationV2 as cancelEventRegistration,
  checkInRegistrationV2,
  checkInRegistrationV2 as checkInRegistration,
  fetchEventRegistrationsV2,
  fetchEventRegistrationsV2 as fetchEventRegistrations,
} from './eventRegistrationSlice';
export { sendEventRemindersV2, sendEventRemindersV2 as sendEventReminders } from './eventRemindersSlice';
export { 
  createEventV2, createEventV2 as createEvent,
  deleteEventV2, deleteEventV2 as deleteEvent,
  updateEventV2, updateEventV2 as updateEvent 
} from './eventMutationSlice';
export {
  cancelEventAutomationV2, cancelEventAutomationV2 as cancelEventAutomation,
  createEventAutomationV2, createEventAutomationV2 as createEventAutomation,
  fetchEventAutomationsV2, fetchEventAutomationsV2 as fetchEventAutomations,
  syncEventAutomationsV2, syncEventAutomationsV2 as syncEventAutomations,
} from './eventAutomationSlice';
