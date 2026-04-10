import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PageLoader from '../PageLoader';

describe('PageLoader', () => {
  it('announces itself as a loading status region', () => {
    render(<PageLoader />);

    expect(screen.getByRole('status', { name: /loading application/i })).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
