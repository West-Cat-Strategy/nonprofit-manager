export const normalizePortalStatus = (
  value: unknown
): 'open' | 'closed' | 'archived' | undefined => {
  if (value === 'open' || value === 'closed' || value === 'archived') {
    return value;
  }

  return undefined;
};
