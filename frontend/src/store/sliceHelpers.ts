/**
 * Redux Slice Helpers
 * Reusable patterns for common CRUD slice operations
 */

import type { Draft } from '@reduxjs/toolkit';

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
