import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ErrorBoundary from '../ErrorBoundary';

const CrashyContent = ({ shouldCrash }: { shouldCrash: boolean }) => {
  if (shouldCrash) {
    throw new Error('boom');
  }

  return <h1>Recovered</h1>;
};

const BoundaryHarness = () => {
  const [shouldCrash, setShouldCrash] = useState(true);

  return (
    <div>
      <button type="button" onClick={() => setShouldCrash(false)}>
        Fix crash
      </button>
      <ErrorBoundary>
        <CrashyContent shouldCrash={shouldCrash} />
      </ErrorBoundary>
    </div>
  );
};

describe('ErrorBoundary', () => {
  it('recovers after the issue is fixed and the retry button is used', async () => {
    const user = userEvent.setup();

    render(<BoundaryHarness />);

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');

    await user.click(screen.getByRole('button', { name: /fix crash/i }));
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByRole('heading', { name: 'Recovered' })).toBeInTheDocument();
  });
});
