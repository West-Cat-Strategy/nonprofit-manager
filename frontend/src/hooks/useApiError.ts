import { useCallback, useState } from 'react';
import { formatApiErrorMessage, parseApiError } from '../utils/apiError';
import { useToast } from '../contexts/useToast';

type ApiError = ReturnType<typeof parseApiError>;

export const useApiError = (options: { notify?: boolean } = {}) => {
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<ApiError | null>(null);
  const { pushToast } = useToast();

  const setFromError = useCallback((err: unknown, fallback: string) => {
    const parsed = parseApiError(err, fallback);
    setError(formatApiErrorMessage(err, fallback));
    setDetails(parsed);
    if (options.notify) {
      pushToast({
        message: parsed.message,
        correlationId: parsed.correlationId,
        variant: 'error',
      });
    }
  }, [options.notify, pushToast]);

  const clear = useCallback(() => {
    setError(null);
    setDetails(null);
  }, []);

  return {
    error,
    details,
    setFromError,
    clear,
  };
};
