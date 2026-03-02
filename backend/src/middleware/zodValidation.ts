/**
 * Zod Validation Middleware
 * Middleware for validating requests using Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '@modules/shared/http/envelope';

type ValidationIssueSource = 'body' | 'query' | 'params';

export interface ValidationIssue {
  source: ValidationIssueSource;
  path: string;
  message: string;
  code: string;
}

interface ValidationSource {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Result of validation
 */
export interface ValidationResult {
  success: boolean;
  data?: unknown;
  error?: string;
  errors?: ValidationIssue[];
}

/**
 * Validate request using Zod schemas
 * Can validate body, query, and params
 */
export function validateRequest(sources: ValidationSource) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: ValidationIssue[] = [];
    const validationMap: Partial<Record<ValidationIssueSource, Record<string, string[]>>> = {};
    let hasError = false;

    // Validate body
    if (sources.body) {
      const result = sources.body.safeParse(req.body);
      if (!result.success) {
        const issues = formatZodIssues(result.error, 'body');
        errors.push(...issues);
        validationMap.body = buildValidationMap(issues);
        hasError = true;
      } else {
        req.body = result.data;
      }
    }

    // Validate query
    if (sources.query) {
      const result = sources.query.safeParse(req.query);
      if (!result.success) {
        const issues = formatZodIssues(result.error, 'query');
        errors.push(...issues);
        validationMap.query = buildValidationMap(issues);
        hasError = true;
      } else {
        // Replace req.query with validated data (as any to match Express typing)
        (req as any).validatedQuery = result.data;
      }
    }

    // Validate params
    if (sources.params) {
      const result = sources.params.safeParse(req.params);
      if (!result.success) {
        const issues = formatZodIssues(result.error, 'params');
        errors.push(...issues);
        validationMap.params = buildValidationMap(issues);
        hasError = true;
      } else {
        // Store validated params
        (req as any).validatedParams = result.data;
      }
    }

    // Return early with error if validation failed
    if (hasError) {
      sendError(
        res,
        'validation_error',
        'Validation failed',
        400,
        {
          issues: errors,
          validation: validationMap,
        },
        req.correlationId
      );
      return;
    }

    next();
  };
}

/**
 * Validate only request body using Zod schema
 */
export function validateBody(schema: ZodSchema) {
  return validateRequest({ body: schema });
}

/**
 * Validate only query using Zod schema
 */
export function validateQuery(schema: ZodSchema) {
  return validateRequest({ query: schema });
}

/**
 * Validate only params using Zod schema
 */
export function validateParams(schema: ZodSchema) {
  return validateRequest({ params: schema });
}

/**
 * Validate multiple sources at once
 */
export function validateInputs(
  bodySchema?: ZodSchema,
  querySchema?: ZodSchema,
  paramsSchema?: ZodSchema
) {
  return validateRequest({
    body: bodySchema,
    query: querySchema,
    params: paramsSchema,
  });
}

/**
 * Format Zod errors into a flat structure
 */
function formatZodIssues(
  error: ZodError,
  source: ValidationIssueSource
): ValidationIssue[] {
  return error.issues.map((issue) => ({
    source,
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
}

function buildValidationMap(issues: ValidationIssue[]): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  issues.forEach((issue) => {
    const path = issue.path || '_';
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  });

  return formatted;
}

/**
 * Validate data imperatively (for use in services/controllers)
 */
export function validateData<T>(schema: ZodSchema, data: unknown): ValidationResult {
  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      error: 'Validation failed',
      errors: formatZodIssues(result.error, 'body'),
    };
  }

  return {
    success: true,
    data: result.data as T,
  };
}

/**
 * Validate data and throw on error (for use in controllers)
 */
export function validateDataOrThrow<T>(schema: ZodSchema, data: unknown): T {
  const result = validateData<T>(schema, data);
  if (!result.success) {
    const error = new Error(result.error);
    (error as any).statusCode = 400;
    (error as any).details = result.errors;
    throw error;
  }
  return result.data as T;
}

/**
 * Partial validation - useful for PATCH requests
 */
export function validatePartial<T>(schema: ZodSchema, data: unknown): ValidationResult {
  // Convert to partial schema
  const partialSchema = schema instanceof Object && 'partial' in schema
    ? (schema as any).partial()
    : schema;

  return validateData<T>(partialSchema, data);
}

/**
 * Helper to attach validated data to request
 * Usage: req.validated = validateAndAttach(schema, req.body)
 */
export interface RequestWithValidation extends Request {
  validated?: {
    body?: unknown;
    query?: unknown;
    params?: unknown;
  };
}
