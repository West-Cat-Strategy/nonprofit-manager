import { combineReducers } from '@reduxjs/toolkit';
import coreReducer from './accountsCore';
import listReducer from './accountsListSlice';

const accountsReducer = combineReducers({
  core: coreReducer,
  list: listReducer,
});

export default accountsReducer;

export type { Account } from '../types/contracts';
export * from './accountsCore';
export * from './accountsListSlice';

// Selectors
export const selectAccountsCore = (state: any) => state.accounts.core;
export const selectAccountsList = (state: any) => state.accounts.list;
