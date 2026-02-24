/**
 * Response Helpers
 * Standardized HTTP response utilities for controllers
 */

import { Response } from 'express';
import {
  ApiErrorEnvelope,
  buildApiErrorPayload,
  sendError,
  sendSuccess,
} from '@modules/shared/http/envelope';

const normalizeDetails = (details: unknown): Record<string, unknown> | undefined => {
  if (!details) return undefined;
  if (typeof details === 'object' && !Array.isArray(details)) {
    return details as Record<string, unknown>;
  }
  return { issues: Array.isArray(details) ? details : [details] };
};

export const errorPayload = (
  res: Response,
  message: string,
  details?: unknown,
  code?: string
): ApiErrorEnvelope => {
  return buildApiErrorPayload(
    res,
    code || 'request_error',
    message,
    normalizeDetails(details)
  );
};

/**
 * Send a 404 Not Found response
 */
export const notFound = (res: Response, entity: string = 'Resource'): void => {
  sendError(res, 'not_found', `${entity} not found`, 404);
};

/**
 * Send a 404 Not Found response with a custom message
 */
export const notFoundMessage = (res: Response, message: string): void => {
  sendError(res, 'not_found', message, 404);
};

/**
 * Send a 409 Conflict response
 */
export const conflict = (res: Response, message: string): void => {
  sendError(res, 'conflict', message, 409);
};

/**
 * Send a 400 Bad Request response
 */
export const badRequest = (res: Response, message: string, details?: unknown): void => {
  sendError(res, 'bad_request', message, 400, normalizeDetails(details));
};

/**
 * Send a 401 Unauthorized response
 */
export const unauthorized = (res: Response, message: string = 'Unauthorized'): void => {
  sendError(res, 'unauthorized', message, 401);
};

/**
 * Send a 403 Forbidden response
 */
export const forbidden = (res: Response, message: string = 'Forbidden'): void => {
  sendError(res, 'forbidden', message, 403);
};

/**
 * Send a 422 Unprocessable Entity response (validation errors)
 */
export const validationError = (
  res: Response,
  errors: Record<string, string> | string[]
): void => {
  sendError(res, 'validation_error', 'Validation failed', 400, normalizeDetails(errors));
};

/**
 * Send a 400 Bad Request response with express-validator errors
 */
export const validationErrorResponse = (
  res: Response,
  errors: { array: () => unknown }
): void => {
  sendError(res, 'validation_error', 'Validation failed', 400, normalizeDetails(errors.array()));
};

/**
 * Send a 500 Internal Server Error response
 */
export const serverError = (
  res: Response,
  message: string = 'Internal server error',
  details?: unknown
): void => {
  sendError(res, 'server_error', message, 500, normalizeDetails(details));
};

/**
 * Send a 503 Service Unavailable response
 */
export const serviceUnavailable = (res: Response, message: string, details?: unknown): void => {
  sendError(res, 'service_unavailable', message, 503, normalizeDetails(details));
};

/**
 * Send a 423 Locked response
 */
export const locked = (res: Response, message: string, details?: unknown): void => {
  sendError(res, 'locked', message, 423, normalizeDetails(details));
};

/**
 * Send a 201 Created response with data
 */
export const created = <T>(res: Response, data: T): void => {
  sendSuccess(res, data, 201);
};

/**
 * Send a 204 No Content response
 */
export const noContent = (res: Response): void => {
  res.status(204).send();
};

/**
 * Send a successful response with pagination metadata
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const paginated = <T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number
): void => {
  sendSuccess(res, {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};
