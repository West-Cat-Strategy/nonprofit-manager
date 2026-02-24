import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '../types/api';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseCanonicalError = (
  errorValue: unknown
): { message?: string; code?: string; details?: unknown } => {
  if (!isObject(errorValue)) {
    return {};
  }

  const message =
    typeof errorValue.message === 'string'
      ? errorValue.message
      : undefined;
  const code =
    typeof errorValue.code === 'string'
      ? errorValue.code
      : undefined;

  return {
    message,
    code,
    details: errorValue.details,
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
