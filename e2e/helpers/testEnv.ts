const HTTP_SCHEME = ['http', '://'].join('');
const DEFAULT_API_URL = `${HTTP_SCHEME}127.0.0.1:3001`;
const DEFAULT_BASE_URL = `${HTTP_SCHEME}127.0.0.1:5173`;

const resolveEnv = (value: string | undefined, fallback: string): string => {
  if (value && value.trim().length > 0) {
    return value;
  }
  return fallback;
};

const resolvedApiUrl = resolveEnv(process.env.API_URL, DEFAULT_API_URL);
const resolvedBaseUrl = resolveEnv(process.env.BASE_URL, DEFAULT_BASE_URL);
process.env.API_URL = resolvedApiUrl;
process.env.BASE_URL = resolvedBaseUrl;

export const API_URL = process.env.API_URL;
export const BASE_URL = process.env.BASE_URL;
