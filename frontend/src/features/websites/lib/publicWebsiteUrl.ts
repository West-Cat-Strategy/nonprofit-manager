export const isConfiguredPublicWebsiteUrl = (value?: string | null): boolean => {
  if (!value) return false;

  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname !== 'sites.example.org' && !hostname.endsWith('.sites.example.org');
  } catch {
    return false;
  }
};

export const getWebsiteConsoleUrlTarget = (
  target:
    | {
        previewUrl?: string | null;
        primaryUrl?: string | null;
      }
    | null
    | undefined
): string | null => {
  const candidates = [target?.previewUrl, target?.primaryUrl];
  return candidates.find((candidate) => isConfiguredPublicWebsiteUrl(candidate)) || null;
};
