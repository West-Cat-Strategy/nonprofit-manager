const EXECUTABLE_URL_SCHEME_REGEX = /^(javascript|data|vbscript):/i;

export const resolveSafeNavigationTarget = (target: string | null | undefined): string | null => {
  const trimmed = target?.trim();
  if (!trimmed) {
    return null;
  }

  if (EXECUTABLE_URL_SCHEME_REGEX.test(trimmed) || trimmed.startsWith('//')) {
    return null;
  }

  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    return trimmed;
  } catch {
    return null;
  }
};
