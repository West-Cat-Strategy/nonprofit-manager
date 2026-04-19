import { combineReducers } from '@reduxjs/toolkit';
import coreReducer from './volunteersCore';
import listReducer from './volunteersListSlice';
import assignmentsReducer from './volunteerAssignmentsSlice';
import type { RootState } from '../../../store';

const volunteersReducer = combineReducers({
  core: coreReducer,
  list: listReducer,
  assignments: assignmentsReducer,
});

export default volunteersReducer;

export type { Volunteer, VolunteerAssignment } from '../types/contracts';
export * from './volunteersCore';
export * from './volunteersListSlice';
export * from './volunteerAssignmentsSlice';

// Selectors
export const selectVolunteersCore = (state: RootState) => state.volunteers.core;
export const selectVolunteersList = (state: RootState) => state.volunteers.list;
export const selectVolunteerAssignments = (state: RootState) => state.volunteers.assignments;
