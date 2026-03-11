import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '../types/api';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const formatIssueMessage = (issue: unknown): string | undefined => {
  if (!isObject(issue) || typeof issue.message !== 'string') {
    return undefined;
  }

  const path = typeof issue.path === 'string' ? issue.path : '';
  if (path && path !== '_') {
    return `${path}: ${issue.message}`;
  }

  return issue.message;
};

const extractValidationMessage = (details: unknown): string | undefined => {
  if (!isObject(details)) {
    return undefined;
  }

  if (Array.isArray(details.issues)) {
    for (const issue of details.issues) {
      const formatted = formatIssueMessage(issue);
      if (formatted) {
        return formatted;
      }
    }
  }

  if (!isObject(details.validation)) {
    return undefined;
  }

  for (const sourceDetails of Object.values(details.validation)) {
    if (!isObject(sourceDetails)) {
      continue;
    }

    for (const [path, messages] of Object.entries(sourceDetails)) {
      if (!Array.isArray(messages)) {
        continue;
      }

      const firstMessage = messages.find((message): message is string => typeof message === 'string');
      if (firstMessage) {
        return path && path !== '_' ? `${path}: ${firstMessage}` : firstMessage;
      }
    }
  }

  return undefined;
};

const normalizeCanonicalMessage = (message: string | undefined, details: unknown): string | undefined => {
  if (!message) {
    return undefined;
  }

  if (/^validation failed$/i.test(message)) {
    return extractValidationMessage(details) || message;
  }

  return message;
};

const parseCanonicalError = (
  errorValue: unknown
): { message?: string; code?: string; details?: unknown } => {
  if (!isObject(errorValue)) {
    return {};
  }

  const details = errorValue.details;
  const message = normalizeCanonicalMessage(
    typeof errorValue.message === 'string' ? errorValue.message : undefined,
    details
  );
  const code =
    typeof errorValue.code === 'string'
      ? errorValue.code
      : undefined;

  return {
    message,
    code,
    details,
  };
};

type UnknownError = {
  message?: string;
  response?: {
    data?: ApiErrorResponse | { error?: string | { message?: string; code?: string; details?: unknown }; errors?: unknown };
  };
};

export interface ParsedApiError {
  message: string;
  code?: string;
  correlationId?: string;
  details?: unknown;
}

export const parseApiError = (error: unknown, fallbackMessage: string): ParsedApiError => {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  const data = axiosError?.response?.data as ApiErrorResponse | undefined;

  if (data?.error) {
    if (typeof data.error === 'string') {
      return {
        message: data.error,
        code: data.code,
        correlationId: data.correlationId,
        details: data.details,
      };
    }

    const canonical = parseCanonicalError(data.error);
    return {
      message: canonical.message || fallbackMessage,
      code: canonical.code || data.code,
      correlationId: data.correlationId,
      details: canonical.details ?? data.details,
    };
  }

  const unknown = error as UnknownError;
  const nestedCanonical = parseCanonicalError(unknown?.response?.data?.error);
  if (nestedCanonical.message) {
    return {
      message: nestedCanonical.message,
      code: nestedCanonical.code,
      details: nestedCanonical.details,
    };
  }
  const message = unknown?.message || fallbackMessage;
  return { message };
};

export const formatApiErrorMessage = (error: unknown, fallbackMessage: string): string => {
  const parsed = parseApiError(error, fallbackMessage);
  if (parsed.correlationId) {
    return `${parsed.message} (Ref: ${parsed.correlationId})`;
  }
  return parsed.message;
};

export const formatApiErrorMessageWith = (fallbackMessage: string) => (error: unknown): string =>
  formatApiErrorMessage(error, fallbackMessage);
