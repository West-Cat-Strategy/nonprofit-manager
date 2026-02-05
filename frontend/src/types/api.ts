export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
  correlationId?: string;
}
