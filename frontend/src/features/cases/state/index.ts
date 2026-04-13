import { combineReducers } from '@reduxjs/toolkit';
import coreReducer from './casesCore';
import listReducer from './casesListSlice';
import notesReducer from './caseNotesSlice';
import managementReducer from './caseManagementSlice';

const casesReducer = combineReducers({
  core: coreReducer,
  list: listReducer,
  notes: notesReducer,
  management: managementReducer,
});

export default casesReducer;

// Export all actions from sub-slices
export * from './casesCore';
export * from './casesListSlice';
export * from './caseNotesSlice';
export * from './caseManagementSlice';

// Base Selectors
export const selectCasesBase = (state: any) => state.cases;
export const selectCasesCore = (state: any) => state.cases.core;
export const selectCasesList = (state: any) => state.cases.list;
export const selectCaseNotes = (state: any) => state.cases.notes;
export const selectCaseManagement = (state: any) => state.cases.management;
