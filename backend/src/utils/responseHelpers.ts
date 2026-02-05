/**
 * Response Helpers
 * Standardized HTTP response utilities for controllers
 */

import { Response } from 'express';

const CORRELATION_ID_HEADER = 'x-correlation-id';

const getCorrelationId = (res: Response): string | undefined => {
  const header = res.getHeader(CORRELATION_ID_HEADER);
  if (Array.isArray(header)) {
    return header[0];
  }
  if (typeof header === 'string') {
    return header;
  }
  return undefined;
};

const buildErrorPayload = (
  res: Response,
  message: string,
  details?: unknown,
  code?: string
): Record<string, unknown> => {
  const correlationId = getCorrelationId(res);
  return {
    error: message,
    ...(code ? { code } : {}),
    ...(details ? { details } : {}),
    ...(correlationId ? { correlationId } : {}),
  };
};

export const errorPayload = (
  res: Response,
  message: string,
  details?: unknown,
  code?: string
): Record<string, unknown> => buildErrorPayload(res, message, details, code);

/**
 * Send a 404 Not Found response
 */
export const notFound = (res: Response, entity: string = 'Resource'): void => {
  res.status(404).json(buildErrorPayload(res, `${entity} not found`, undefined, 'not_found'));
};

/**
 * Send a 404 Not Found response with a custom message
 */
export const notFoundMessage = (res: Response, message: string): void => {
  res.status(404).json(buildErrorPayload(res, message, undefined, 'not_found'));
};

/**
 * Send a 409 Conflict response
 */
export const conflict = (res: Response, message: string): void => {
  res.status(409).json(buildErrorPayload(res, message, undefined, 'conflict'));
};

/**
 * Send a 400 Bad Request response
 */
export const badRequest = (res: Response, message: string): void => {
  res.status(400).json(buildErrorPayload(res, message, undefined, 'bad_request'));
};

/**
 * Send a 401 Unauthorized response
 */
export const unauthorized = (res: Response, message: string = 'Unauthorized'): void => {
  res.status(401).json(buildErrorPayload(res, message, undefined, 'unauthorized'));
};

/**
 * Send a 403 Forbidden response
 */
export const forbidden = (res: Response, message: string = 'Forbidden'): void => {
  res.status(403).json(buildErrorPayload(res, message, undefined, 'forbidden'));
};

/**
 * Send a 422 Unprocessable Entity response (validation errors)
 */
export const validationError = (res: Response, errors: Record<string, string> | string[]): void => {
  res.status(422).json(buildErrorPayload(res, 'Validation failed', errors, 'validation_error'));
};

/**
 * Send a 400 Bad Request response with express-validator errors
 */
export const validationErrorResponse = (
  res: Response,
  errors: { array: () => unknown }
): void => {
  res.status(400).json(
    buildErrorPayload(res, 'Validation failed', errors.array(), 'validation_error')
  );
};

/**
 * Send a 500 Internal Server Error response
 */
export const serverError = (res: Response, message: string = 'Internal server error'): void => {
  res.status(500).json(buildErrorPayload(res, message, undefined, 'server_error'));
};

/**
 * Send a 503 Service Unavailable response
 */
export const serviceUnavailable = (res: Response, message: string): void => {
  res.status(503).json(buildErrorPayload(res, message, undefined, 'service_unavailable'));
};

/**
 * Send a 423 Locked response
 */
export const locked = (res: Response, message: string, details?: unknown): void => {
  res.status(423).json(buildErrorPayload(res, message, details, 'locked'));
};

/**
 * Send a 201 Created response with data
 */
export const created = <T>(res: Response, data: T): void => {
  res.status(201).json(data);
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
  res.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};
