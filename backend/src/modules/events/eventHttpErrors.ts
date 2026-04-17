export interface EventHttpError extends Error {
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

export const createEventHttpError = (
  code: string,
  statusCode: number,
  message: string,
  details?: Record<string, unknown>
): EventHttpError => {
  const error = new Error(message) as EventHttpError;
  error.code = code;
  error.statusCode = statusCode;
  if (details) {
    error.details = details;
  }
  return error;
};

export const isEventHttpError = (error: unknown): error is EventHttpError => {
  if (!(error instanceof Error)) {
    return false;
  }

  const candidate = error as Partial<EventHttpError>;
  return typeof candidate.code === 'string' && typeof candidate.statusCode === 'number';
};
