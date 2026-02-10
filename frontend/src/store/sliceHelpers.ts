/**
 * Redux Slice Helpers
 * Reusable patterns for common CRUD slice operations
 */

import type { PayloadAction, Draft } from '@reduxjs/toolkit';

/**
 * Common pagination structure used across slices
 */
export interface PaginationState {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/**
 * Base state interface for CRUD slices
 */
export interface BaseCrudState<T> {
  items: T[];
  selectedItem: T | null;
  pagination: PaginationState;
  loading: boolean;
  error: string | null;
}

/**
 * Create initial state for a CRUD slice
 */
export function createInitialCrudState<T>(): BaseCrudState<T> {
  return {
    items: [],
    selectedItem: null,
    pagination: {
      total: 0,
      page: 1,
      limit: 20,
      total_pages: 0,
    },
    loading: false,
    error: null,
  };
}

/**
 * Standard pending handler - sets loading true, clears error
 */
export function handlePending<S extends { loading: boolean; error: string | null }>(
  state: Draft<S>
): void {
  state.loading = true;
  state.error = null;
}

/**
 * Standard rejected handler - sets loading false, captures error
 */
export function handleRejected<S extends { loading: boolean; error: string | null }>(
  state: Draft<S>,
  action: { error: { message?: string } },
  defaultMessage: string
): void {
  state.loading = false;
  state.error = action.error.message || defaultMessage;
}

/**
 * Handler for fetchItems fulfilled - updates items list and pagination
 */
export function handleFetchItemsFulfilled<
  S extends BaseCrudState<T>,
  T,
  P extends { data: T[]; pagination: PaginationState }
>(state: Draft<S>, action: PayloadAction<P>): void {
  state.loading = false;
  state.items = action.payload.data as Draft<T>[];
  state.pagination = action.payload.pagination;
}

/**
 * Handler for fetchItemById fulfilled - updates selectedItem
 */
export function handleFetchItemByIdFulfilled<S extends BaseCrudState<T>, T>(
  state: Draft<S>,
  action: PayloadAction<T>
): void {
  state.loading = false;
  state.selectedItem = action.payload as Draft<T>;
}

/**
 * Handler for createItem fulfilled - prepends to items list
 */
export function handleCreateItemFulfilled<S extends BaseCrudState<T>, T>(
  state: Draft<S>,
  action: PayloadAction<T>
): void {
  state.loading = false;
  state.items.unshift(action.payload as Draft<T>);
}

/**
 * Handler for updateItem fulfilled - updates item in list and selectedItem if matching
 */
export function handleUpdateItemFulfilled<S extends BaseCrudState<T>, T>(
  state: Draft<S>,
  action: PayloadAction<T>,
  idField: keyof T
): void {
  state.loading = false;
  const updatedItem = action.payload;
  const itemId = updatedItem[idField];

  const index = state.items.findIndex(
    (item) => (item as T)[idField] === itemId
  );
  if (index !== -1) {
    state.items[index] = updatedItem as Draft<T>;
  }

  if (state.selectedItem && (state.selectedItem as T)[idField] === itemId) {
    state.selectedItem = updatedItem as Draft<T>;
  }
}

/**
 * Handler for deleteItem fulfilled - removes from items list and clears selectedItem if matching
 */
export function handleDeleteItemFulfilled<S extends BaseCrudState<T>, T>(
  state: Draft<S>,
  action: PayloadAction<string>,
  idField: keyof T
): void {
  state.loading = false;
  const deletedId = action.payload;

  state.items = state.items.filter(
    (item) => (item as T)[idField] !== deletedId
  );

  if (state.selectedItem && (state.selectedItem as T)[idField] === deletedId) {
    state.selectedItem = null as Draft<T> | null;
  }
}

/**
 * Create standard clear reducers for a slice
 */
export function createClearReducers<T>() {
  return {
     
    clearSelectedItem: (state: Draft<BaseCrudState<T>>) => {
      state.selectedItem = null as Draft<T> | null;
    },
     
    clearError: (state: Draft<BaseCrudState<T>>) => {
      state.error = null;
    },
  };
}

/**
 * Build query params from filters and pagination objects
 * Commonly used in thunks before API calls
 */
export function buildQueryParams(
  filters?: Record<string, unknown>,
  pagination?: Record<string, unknown>
): URLSearchParams {
  const queryParams = new URLSearchParams();

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });
  }

  if (pagination) {
    Object.entries(pagination).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
  }

  return queryParams;
}

/**
 * Default pagination params
 */
export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
} as const;
