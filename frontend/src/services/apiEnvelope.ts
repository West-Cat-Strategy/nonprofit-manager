export type ApiEnvelope<T> = {
  success: true;
  data: T;
};

export type ApiErrorEnvelope = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  correlationId?: string;
};

const isApiEnvelope = <T>(payload: ApiEnvelope<T> | T): payload is ApiEnvelope<T> => {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      (payload as { success?: unknown }).success === true &&
      'data' in (payload as object)
  );
};

export const unwrapApiData = <T>(payload: ApiEnvelope<T> | T): T => {
  if (isApiEnvelope(payload)) {
    return payload.data;
  }
  return payload;
};
