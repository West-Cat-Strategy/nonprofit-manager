import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { MemoryRouter, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useStableSearchParamsWriter } from '../useStableSearchParams';

const StableSearchHarness = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { writeSearchParams, shouldApplySearchParams } =
    useStableSearchParamsWriter(setSearchParams);
  const [value, setValue] = useState(searchParams.get('search') || '');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!shouldApplySearchParams()) {
      return;
    }

    setValue(searchParams.get('search') || '');
  }, [searchParams, shouldApplySearchParams]);

  const writeInternalSearch = (search: string) => {
    const nextParams = new URLSearchParams();
    if (search) {
      nextParams.set('search', search);
    }
    writeSearchParams(nextParams, { replace: true });
  };

  return (
    <div>
      <input
        aria-label="Stable search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <div data-testid="location-search">{location.search}</div>
      <button type="button" onClick={() => writeInternalSearch('stale')}>
        Write stale URL
      </button>
      <button type="button" onClick={() => writeInternalSearch('seed')}>
        Write same URL
      </button>
      <button type="button" onClick={() => navigate('/')}>
        External empty
      </button>
      <button type="button" onClick={() => navigate('/?search=seed')}>
        External seed
      </button>
    </div>
  );
};

const renderHarness = (route = '/') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <StableSearchHarness />
    </MemoryRouter>
  );

describe('useStableSearchParamsWriter', () => {
  it('keeps local input authoritative when an internal URL write arrives', async () => {
    renderHarness();

    const input = screen.getByLabelText('Stable search');
    fireEvent.change(input, { target: { value: 'alex' } });

    fireEvent.click(screen.getByRole('button', { name: 'Write stale URL' }));

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent('?search=stale');
    });
    expect(input).toHaveValue('alex');
  });

  it('does not treat unchanged writes as internal navigation to ignore later', async () => {
    renderHarness('/?search=seed');

    const input = screen.getByLabelText('Stable search');
    expect(input).toHaveValue('seed');

    fireEvent.click(screen.getByRole('button', { name: 'Write same URL' }));
    fireEvent.click(screen.getByRole('button', { name: 'External empty' }));

    await waitFor(() => {
      expect(input).toHaveValue('');
    });

    fireEvent.click(screen.getByRole('button', { name: 'External seed' }));

    await waitFor(() => {
      expect(input).toHaveValue('seed');
    });
  });
});
