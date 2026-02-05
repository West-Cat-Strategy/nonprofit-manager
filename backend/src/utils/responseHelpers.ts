/**
 * Response Helpers
 * Standardized HTTP response utilities for controllers
 */

import { Response } from 'express';

/**
 * Send a 404 Not Found response
 */
export const notFound = (res: Response, entity: string = 'Resource'): void => {
  res.status(404).json({ error: `${entity} not found` });
};

/**
 * Send a 404 Not Found response with a custom message
 */
export const notFoundMessage = (res: Response, message: string): void => {
  res.status(404).json({ error: message });
};

/**
 * Send a 409 Conflict response
 */
export const conflict = (res: Response, message: string): void => {
  res.status(409).json({ error: message });
};

/**
 * Send a 400 Bad Request response
 */
export const badRequest = (res: Response, message: string): void => {
  res.status(400).json({ error: message });
};

/**
 * Send a 401 Unauthorized response
 */
export const unauthorized = (res: Response, message: string = 'Unauthorized'): void => {
  res.status(401).json({ error: message });
};

/**
 * Send a 403 Forbidden response
 */
export const forbidden = (res: Response, message: string = 'Forbidden'): void => {
  res.status(403).json({ error: message });
};

/**
 * Send a 422 Unprocessable Entity response (validation errors)
 */
export const validationError = (res: Response, errors: Record<string, string> | string[]): void => {
  res.status(422).json({ error: 'Validation failed', details: errors });
};

/**
 * Send a 400 Bad Request response with express-validator errors
 */
export const validationErrorResponse = (
  res: Response,
  errors: { array: () => unknown }
): void => {
  res.status(400).json({ errors: errors.array() });
};

/**
 * Send a 500 Internal Server Error response
 */
export const serverError = (res: Response, message: string = 'Internal server error'): void => {
  res.status(500).json({ error: message });
};

/**
 * Send a 503 Service Unavailable response
 */
export const serviceUnavailable = (res: Response, message: string): void => {
  res.status(503).json({ error: message });
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
