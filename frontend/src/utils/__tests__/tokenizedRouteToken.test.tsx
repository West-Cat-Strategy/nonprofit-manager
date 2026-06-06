import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { useTokenizedRouteToken } from '../tokenizedRouteToken';

const TokenProbe = ({ scrubPath }: { scrubPath: string }) => {
  const { token: routeToken } = useParams<{ token: string }>();
  const token = useTokenizedRouteToken(routeToken, { scrubPath, preserveSearch: false });
  return <output aria-label="token">{token || 'missing'}</output>;
};

const renderProbe = (route: string, path: string, scrubPath: string) => {
  window.history.replaceState(null, '', route);
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={<TokenProbe scrubPath={scrubPath} />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('useTokenizedRouteToken', () => {
  it('captures a path token and scrubs it from the browser URL', async () => {
    renderProbe(
      '/admin-registration-review/review.token.value?mode=complete',
      '/admin-registration-review/:token',
      '/admin-registration-review'
    );

    expect(screen.getByLabelText('token')).toHaveTextContent('review.token.value');
    await waitFor(() => {
      expect(window.location.pathname).toBe('/admin-registration-review');
    });
    expect(window.location.search).toBe('');
  });

  it('captures a hash token and scrubs it from the browser URL', async () => {
    renderProbe('/reset-password#token=reset.token.value', '/reset-password', '/reset-password');

    expect(screen.getByLabelText('token')).toHaveTextContent('reset.token.value');
    await waitFor(() => {
      expect(window.location.hash).toBe('');
    });
    expect(window.location.pathname).toBe('/reset-password');
  });
});
