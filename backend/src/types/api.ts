export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
  correlationId?: string;
}

export interface ApiSuccessResponse<T> {
  data: T;
}
