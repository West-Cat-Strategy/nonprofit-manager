import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { AppDispatch } from '../../../../store';
import type { CaseFilter } from '../../../../types/case';
import { useCaseListQueryState } from '../useCaseListQueryState';

function QueryStateHarness({ dispatch }: { dispatch: AppDispatch }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryState = useCaseListQueryState({
    dispatch,
    initialFiltersFromStore: { page: 1, limit: 20 } as CaseFilter,
    searchParams,
    setSearchParams,
  });

  return (
    <div>
      <div data-testid="search-term">{queryState.searchTerm}</div>
      <div data-testid="priority">{queryState.selectedPriority || 'none'}</div>
      <div data-testid="quick-filter">{queryState.quickFilter}</div>
      <div data-testid="page">{queryState.filters.page}</div>
      <button
        type="button"
        onClick={() =>
          setSearchParams(
            new URLSearchParams('search=beta&priority=high&quick_filter=urgent&page=2')
          )
        }
      >
        External query change
      </button>
      <button type="button" onClick={() => setSearchParams(new URLSearchParams())}>
        External clear
      </button>
    </div>
  );
}

describe('useCaseListQueryState', () => {
  it('syncs state from URL changes after initial mount', async () => {
    const dispatch = vi.fn() as unknown as AppDispatch;

    render(
      <MemoryRouter initialEntries={['/cases?search=alpha&priority=medium&page=3']}>
        <Routes>
          <Route path="/cases" element={<QueryStateHarness dispatch={dispatch} />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('search-term')).toHaveTextContent('alpha');
    expect(screen.getByTestId('priority')).toHaveTextContent('medium');
    expect(screen.getByTestId('page')).toHaveTextContent('3');

    fireEvent.click(screen.getByRole('button', { name: /external query change/i }));

    await waitFor(() => {
      expect(screen.getByTestId('search-term')).toHaveTextContent('beta');
      expect(screen.getByTestId('priority')).toHaveTextContent('high');
      expect(screen.getByTestId('quick-filter')).toHaveTextContent('urgent');
      expect(screen.getByTestId('page')).toHaveTextContent('2');
    });

    fireEvent.click(screen.getByRole('button', { name: /external clear/i }));

    await waitFor(() => {
      expect(screen.getByTestId('search-term')).toBeEmptyDOMElement();
      expect(screen.getByTestId('priority')).toHaveTextContent('none');
      expect(screen.getByTestId('quick-filter')).toHaveTextContent('all');
      expect(screen.getByTestId('page')).toHaveTextContent('1');
    });
  });
});
