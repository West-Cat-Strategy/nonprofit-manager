import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '../types/api';

type UnknownError = {
  message?: string;
  response?: {
    data?: ApiErrorResponse | { error?: string; errors?: unknown };
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
    return {
      message: data.error,
      code: data.code,
      correlationId: data.correlationId,
      details: data.details,
    };
  }

  const unknown = error as UnknownError;
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
