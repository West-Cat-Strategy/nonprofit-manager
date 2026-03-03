import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import {
  PrimaryButton,
  SecondaryButton,
  DangerButton,
  PageHeader,
  SectionCard,
  LoadingState,
  EmptyState,
  ErrorState,
  SideNav,
} from '../index';

describe('ui primitives', () => {
  it('renders button tone variants', () => {
    render(
      <div>
        <PrimaryButton>Save</PrimaryButton>
        <SecondaryButton>Cancel</SecondaryButton>
        <DangerButton>Delete</DangerButton>
      </div>
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('renders a page header with title and actions', () => {
    render(<PageHeader title="Accounts" description="Manage organizations" actions={<PrimaryButton>New</PrimaryButton>} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Accounts' })).toBeInTheDocument();
    expect(screen.getByText('Manage organizations')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument();
  });

  it('renders section/state primitives', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <div>
        <SectionCard title="Summary" subtitle="Latest stats">
          <p>Content</p>
        </SectionCard>
        <LoadingState label="Loading records..." />
        <EmptyState title="No records" description="Create one to begin" />
        <ErrorState message="Failed to load" onRetry={onRetry} />
      </div>
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Summary' })).toBeInTheDocument();
    expect(screen.getByText('Loading records...')).toBeInTheDocument();
    expect(screen.getByText('No records')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard navigation for side nav links', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <SideNav
          title="Main"
          items={[
            { key: 'dashboard', label: 'Dashboard', to: '/dashboard', isActive: true },
            { key: 'contacts', label: 'Contacts', to: '/contacts' },
          ]}
        />
      </MemoryRouter>
    );

    await user.tab();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('link', { name: 'Contacts' })).toHaveFocus();
  });
});
