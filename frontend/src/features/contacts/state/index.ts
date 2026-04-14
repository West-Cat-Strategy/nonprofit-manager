import { combineReducers } from '@reduxjs/toolkit';
import contactsCoreReducer from './contactsCore';
import contactsListReducer from './contactsListSlice';
import contactNotesReducer from './contactNotesSlice';
import contactCommunicationsReducer from './contactCommunicationsSlice';
import contactRelationshipsReducer from './contactRelationshipsSlice';
import contactDocumentsReducer from './contactDocumentsSlice';

const contactsReducer = combineReducers({
  core: contactsCoreReducer,
  list: contactsListReducer,
  notes: contactNotesReducer,
  comms: contactCommunicationsReducer,
  relationships: contactRelationshipsReducer,
  documents: contactDocumentsReducer,
});

export type ContactsState = ReturnType<typeof contactsReducer>;

export default contactsReducer;
export { contactsReducer };

export type { Contact } from '../types/contracts';
// Re-export thunks and actions for convenient access
export * from './contactsCore';
export * from './contactsListSlice';
export * from './contactNotesSlice';
export * from './contactCommunicationsSlice';
export * from './contactRelationshipsSlice';
export * from './contactDocumentsSlice';
export * from './contactCases';

// Selectors to abstract nested state structure
export const selectContactsBase = (state: { contacts: ContactsState }) => state.contacts.core;
export const selectContactsList = (state: { contacts: ContactsState }) => state.contacts.list;
export const selectContactNotes = (state: { contacts: ContactsState }) => state.contacts.notes;
export const selectContactComms = (state: { contacts: ContactsState }) => state.contacts.comms;
export const selectContactRelationships = (state: { contacts: ContactsState }) => state.contacts.relationships;
export const selectContactDocuments = (state: { contacts: ContactsState }) => state.contacts.documents;
