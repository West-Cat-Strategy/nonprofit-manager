import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import {
  PrimaryButton,
  SecondaryButton,
  DangerButton,
  FormField,
  PageHeader,
  SectionCard,
  LoadingState,
  EmptyState,
  ErrorState,
  SideNav,
  TopNav,
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
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('bg-red-600');
  });

  it('renders a page header with title and actions', () => {
    render(
      <PageHeader
        title="Accounts"
        description="Manage organizations"
        actions={<PrimaryButton>New</PrimaryButton>}
      />
    );

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
        <FormField label="Email address" helperText="Use your work email" error="Email is required" />
      </div>
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Summary' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Loading records...')).toBeInTheDocument();
    expect(screen.getByText('No records')).toBeInTheDocument();
    const emailField = screen.getByLabelText(/email address/i);
    const emailError = screen.getByText('Email is required');
    expect(emailField).toHaveAttribute('aria-invalid', 'true');
    expect(emailField.getAttribute('aria-describedby')).toContain(emailError.id);
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

  it('keeps side nav states readable across themes', () => {
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

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveClass(
      'text-[var(--app-accent-foreground)]'
    );
    expect(screen.getByRole('link', { name: 'Contacts' })).toHaveClass('text-app-text');
  });

  it('renders top navigation with the opaque shell surface', () => {
    render(<TopNav left={<span>Portal</span>} right={<button type="button">Account</button>} />);

    expect(screen.getByText('Portal').closest('header')).toHaveClass(
      'bg-[var(--app-shell-surface)]'
    );
  });
});
