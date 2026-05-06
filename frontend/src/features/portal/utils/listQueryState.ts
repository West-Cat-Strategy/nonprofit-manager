import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStableSearchParamsWriter } from '../../../hooks/useStableSearchParams';
import type { PortalSortOrder } from '../types/contracts';

interface UsePortalListUrlStateOptions<TSort extends string> {
  sortValues: readonly TSort[];
  defaultSort: TSort;
  defaultOrder: PortalSortOrder;
}

interface PortalListUrlState<TSort extends string> {
  search: string;
  sort: TSort;
  order: PortalSortOrder;
  setSearch: (value: string) => void;
  setSort: (value: TSort) => void;
  setOrder: (value: PortalSortOrder) => void;
}

const normalizeSearchValue = (value: string | null): string => value?.trim() ?? '';

const parsePortalSortOrder = (
  value: string | null,
  fallback: PortalSortOrder
): PortalSortOrder => {
  if (value === 'asc' || value === 'desc') {
    return value;
  }

  return fallback;
};

const parseAllowedValue = <TAllowed extends string>(
  value: string | null,
  allowedValues: readonly TAllowed[],
  fallback: TAllowed
): TAllowed => {
  if (value && allowedValues.includes(value as TAllowed)) {
    return value as TAllowed;
  }

  return fallback;
};

export const usePortalListUrlState = <TSort extends string>({
  sortValues,
  defaultSort,
  defaultOrder,
}: UsePortalListUrlStateOptions<TSort>): PortalListUrlState<TSort> => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { writeSearchParams, shouldApplySearchParams } =
    useStableSearchParamsWriter(setSearchParams);

  const urlSearch = normalizeSearchValue(searchParams.get('search'));
  const [search, setSearchState] = useState(urlSearch);
  const sort = parseAllowedValue(searchParams.get('sort'), sortValues, defaultSort);
  const order = parsePortalSortOrder(searchParams.get('order'), defaultOrder);

  useEffect(() => {
    if (!shouldApplySearchParams()) {
      return;
    }

    setSearchState(urlSearch);
  }, [urlSearch, shouldApplySearchParams]);

  const writeState = useCallback(
    (nextState: { search: string; sort: TSort; order: PortalSortOrder }) => {
      writeSearchParams((nextParams) => {
        if (nextState.search) {
          nextParams.set('search', nextState.search.trim());
        } else {
          nextParams.delete('search');
        }

        if (nextState.sort === defaultSort) {
          nextParams.delete('sort');
        } else {
          nextParams.set('sort', nextState.sort);
        }

        if (nextState.order === defaultOrder) {
          nextParams.delete('order');
        } else {
          nextParams.set('order', nextState.order);
        }

        return nextParams;
      }, { replace: true });
    },
    [defaultOrder, defaultSort, writeSearchParams]
  );

  const setSearch = useCallback(
    (value: string) => {
      setSearchState(value);
      writeState({
        search: value.trim(),
        sort,
        order,
      });
    },
    [order, sort, writeState]
  );

  const setSort = useCallback(
    (value: TSort) => {
      writeState({
        search,
        sort: value,
        order,
      });
    },
    [order, search, writeState]
  );

  const setOrder = useCallback(
    (value: PortalSortOrder) => {
      writeState({
        search,
        sort,
        order: value,
      });
    },
    [search, sort, writeState]
  );

  return {
    search,
    sort,
    order,
    setSearch,
    setSort,
    setOrder,
  };
};
