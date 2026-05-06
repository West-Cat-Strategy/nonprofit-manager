import { useCallback, useEffect, useRef } from 'react';
import { useLocation, type SetURLSearchParams } from 'react-router-dom';

type SearchParamsUpdate =
  | URLSearchParams
  | ((current: URLSearchParams) => URLSearchParams | void);

type SearchParamsWriteOptions = {
  replace?: boolean;
};

const toLocationSearch = (params: URLSearchParams): string => {
  const value = params.toString();
  return value ? `?${value}` : '';
};

const rememberInternalSearch = (searches: Set<string>, search: string) => {
  searches.add(search);

  if (searches.size <= 50) {
    return;
  }

  const oldest = searches.values().next().value as string | undefined;
  if (oldest !== undefined) {
    searches.delete(oldest);
  }
};

export function useStableSearchParamsWriter(setSearchParams: SetURLSearchParams) {
  const location = useLocation();
  const internalSearchesRef = useRef<Set<string>>(new Set());
  const locationSearchRef = useRef(location.search);
  const latestParamsRef = useRef(new URLSearchParams(location.search));

  useEffect(() => {
    locationSearchRef.current = location.search;

    if (!internalSearchesRef.current.has(location.search)) {
      latestParamsRef.current = new URLSearchParams(location.search);
    }
  }, [location.search]);

  const writeSearchParams = useCallback(
    (update: SearchParamsUpdate, options: SearchParamsWriteOptions = { replace: true }) => {
      const baseParams = new URLSearchParams(latestParamsRef.current);
      const resolvedParams =
        typeof update === 'function' ? update(baseParams) ?? baseParams : update;
      const nextParams = new URLSearchParams(resolvedParams);
      const nextSearch = toLocationSearch(nextParams);

      latestParamsRef.current = nextParams;
      if (nextSearch === locationSearchRef.current) {
        return;
      }

      rememberInternalSearch(internalSearchesRef.current, nextSearch);
      setSearchParams(nextParams, options);
    },
    [setSearchParams]
  );

  const shouldApplySearchParams = useCallback(() => {
    if (!internalSearchesRef.current.has(location.search)) {
      return true;
    }

    internalSearchesRef.current.delete(location.search);
    return false;
  }, [location.search]);

  return { writeSearchParams, shouldApplySearchParams };
}
