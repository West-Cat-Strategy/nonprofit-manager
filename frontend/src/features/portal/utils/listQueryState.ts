import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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

  const search = normalizeSearchValue(searchParams.get('search'));
  const sort = parseAllowedValue(searchParams.get('sort'), sortValues, defaultSort);
  const order = parsePortalSortOrder(searchParams.get('order'), defaultOrder);

  const writeState = useCallback(
    (nextState: { search: string; sort: TSort; order: PortalSortOrder }) => {
      const nextParams = new URLSearchParams(searchParams);

      if (nextState.search) {
        nextParams.set('search', nextState.search);
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

      setSearchParams(nextParams, { replace: true });
    },
    [defaultOrder, defaultSort, searchParams, setSearchParams]
  );

  const setSearch = useCallback(
    (value: string) => {
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
