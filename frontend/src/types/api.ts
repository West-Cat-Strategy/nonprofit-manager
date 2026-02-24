export interface CanonicalApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  success?: boolean;
  error: string | CanonicalApiErrorShape;
  code?: string;
  details?: unknown;
  correlationId?: string;
}
