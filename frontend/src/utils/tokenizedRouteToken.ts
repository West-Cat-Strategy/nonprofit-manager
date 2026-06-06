import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const parseHashToken = (hash: string): string | undefined => {
  const trimmed = hash.replace(/^#/, '').trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith('token=')) {
    return decodeURIComponent(trimmed.slice('token='.length));
  }

  return decodeURIComponent(trimmed);
};

export function useTokenizedRouteToken(
  paramToken: string | undefined,
  options: { scrubPath: string; preserveSearch?: boolean }
): string | undefined {
  const location = useLocation();
  const [token, setToken] = useState<string | undefined>(() => {
    if (paramToken) {
      return paramToken;
    }
    if (typeof window === 'undefined') {
      return undefined;
    }
    return parseHashToken(window.location.hash);
  });

  useEffect(() => {
    const nextToken = paramToken || parseHashToken(location.hash);
    if (nextToken) {
      setToken(nextToken);
    }

    if (typeof window === 'undefined' || !nextToken) {
      return;
    }

    const nextUrl = `${options.scrubPath}${options.preserveSearch === false ? '' : location.search}`;
    window.history.replaceState(window.history.state, '', nextUrl);
  }, [location.hash, location.search, options.preserveSearch, options.scrubPath, paramToken]);

  return token;
}
