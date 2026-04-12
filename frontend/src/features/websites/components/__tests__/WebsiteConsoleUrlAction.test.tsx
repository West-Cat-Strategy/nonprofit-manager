import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WebsiteConsoleUrlAction from '../WebsiteConsoleUrlAction';

describe('WebsiteConsoleUrlAction', () => {
  it('adds noopener noreferrer to safe external links', () => {
    render(
      <WebsiteConsoleUrlAction href="https://mutualaid.org" className="link-class">
        Open site
      </WebsiteConsoleUrlAction>
    );

    const link = screen.getByRole('link', { name: 'Open site' });
    expect(link).toHaveAttribute('href', 'https://mutualaid.org');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders unsafe navigation targets as disabled buttons', () => {
    render(
      <WebsiteConsoleUrlAction href="javascript:alert(1)" className="link-class">
        Open site
      </WebsiteConsoleUrlAction>
    );

    expect(screen.getByRole('button', { name: 'Open site' })).toBeDisabled();
    expect(screen.queryByRole('link', { name: 'Open site' })).not.toBeInTheDocument();
  });
});
