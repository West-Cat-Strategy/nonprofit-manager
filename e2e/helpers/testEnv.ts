const DEFAULT_API_URL = 'http://localhost:3001';
const DEFAULT_BASE_URL = 'http://localhost:5173';
import { getSharedTestUser } from './testUser';

const resolveEnv = (value: string | undefined, fallback: string): string => {
  if (value && value.trim().length > 0) {
    return value;
  }
  return fallback;
};

const resolvedApiUrl = resolveEnv(process.env.API_URL, DEFAULT_API_URL);
process.env.API_URL =
  resolvedApiUrl.endsWith(':3000') || resolvedApiUrl.endsWith(':3000/')
    ? DEFAULT_API_URL
    : resolvedApiUrl;
process.env.BASE_URL = resolveEnv(process.env.BASE_URL, DEFAULT_BASE_URL);

getSharedTestUser();

export const API_URL = process.env.API_URL;
export const BASE_URL = process.env.BASE_URL;
