import { formatApiErrorMessage } from '../../../utils/apiError';

export const getFollowUpErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  return formatApiErrorMessage(error, fallbackMessage);
};
