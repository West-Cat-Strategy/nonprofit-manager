const EXECUTABLE_SCHEME_REGEX = /^(javascript|data|vbscript):/i;
const RELATIVE_OR_SAFE_URL_REGEX = /^(https?:\/\/|mailto:|tel:|\/|\.\.\/|\.\/|#)/i;

export interface SanitizedUrlOptions {
  allowRelative?: boolean;
}

export const sanitizeRenderableUrl = (
  url: string | null | undefined,
  options: SanitizedUrlOptions = {}
): string | null => {
  const trimmed = (url || '').trim();
  if (!trimmed) return null;
  if (EXECUTABLE_SCHEME_REGEX.test(trimmed) || trimmed.startsWith('//')) {
    return null;
  }
  if (RELATIVE_OR_SAFE_URL_REGEX.test(trimmed)) {
    return encodeURI(trimmed).replace(/'/g, '%27').replace(/"/g, '%22');
  }
  if (options.allowRelative !== false && !trimmed.includes(':')) {
    return encodeURI(trimmed).replace(/'/g, '%27').replace(/"/g, '%22');
  }
  return null;
};
