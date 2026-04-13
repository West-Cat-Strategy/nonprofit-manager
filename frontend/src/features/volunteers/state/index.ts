import { combineReducers } from '@reduxjs/toolkit';
import coreReducer from './volunteersCore';
import listReducer from './volunteersListSlice';
import assignmentsReducer from './volunteerAssignmentsSlice';

const volunteersReducer = combineReducers({
  core: coreReducer,
  list: listReducer,
  assignments: assignmentsReducer,
});

export default volunteersReducer;

export * from './volunteersCore';
export * from './volunteersListSlice';
export * from './volunteerAssignmentsSlice';

// Selectors
export const selectVolunteersCore = (state: any) => state.volunteers.core;
export const selectVolunteersList = (state: any) => state.volunteers.list;
export const selectVolunteerAssignments = (state: any) => state.volunteers.assignments;
