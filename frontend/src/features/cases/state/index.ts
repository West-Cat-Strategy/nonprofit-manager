import { combineReducers } from '@reduxjs/toolkit';
import coreReducer from './casesCore';
import listReducer from './casesListSlice';
import notesReducer from './caseNotesSlice';
import managementReducer from './caseManagementSlice';
import type { RootState } from '../../../store';

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
export const selectCasesBase = (state: RootState) => state.cases;
export const selectCasesCore = (state: RootState) => state.cases.core;
export const selectCasesList = (state: RootState) => state.cases.list;
export const selectCaseNotes = (state: RootState) => state.cases.notes;
export const selectCaseManagement = (state: RootState) => state.cases.management;
