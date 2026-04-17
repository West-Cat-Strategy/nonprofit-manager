import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NavigationQuickLookupDialog from '../NavigationQuickLookupDialog';

type QuickLookupMockState = {
  searchTerm: string;
  results: Array<{
    contact_id: string;
    first_name: string;
    last_name: string;
    email: string;
    mobile_phone: string;
    phone: string;
  }>;
  isLoading: boolean;
  isOpen: boolean;
  selectedIndex: number;
  inputRef: { current: HTMLInputElement | null };
  dropdownRef: { current: HTMLDivElement | null };
  handleSearchChange: (event: ChangeEvent<HTMLInputElement> | string) => void;
  handleKeyDown: (event: KeyboardEvent) => void;
  handleFocus: () => void;
  clearSearch: () => void;
  closeDropdown: () => void;
  selectResult: () => void;
};

const { navigateMock, lookupStateRef } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  lookupStateRef: { current: null as QuickLookupMockState | null },
}));

vi.mock('../../dashboard/useQuickLookup', () => ({
  useQuickLookup: () => lookupStateRef.current,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function buildLookupState(overrides: Partial<QuickLookupMockState> = {}): QuickLookupMockState {
  return {
    searchTerm: 'al',
    results: [
      {
        contact_id: '1',
        first_name: 'Alice',
        last_name: 'Rivera',
        email: 'alice@example.com',
        mobile_phone: '',
        phone: '',
      },
      {
        contact_id: '2',
        first_name: 'Alan',
        last_name: 'Stone',
        email: 'alan@example.com',
        mobile_phone: '',
        phone: '',
      },
    ],
    isLoading: false,
    isOpen: true,
    selectedIndex: -1,
    inputRef: { current: null } as { current: HTMLInputElement | null },
    dropdownRef: { current: null } as { current: HTMLDivElement | null },
    handleSearchChange: vi.fn((_event: ChangeEvent<HTMLInputElement> | string) => undefined),
    handleKeyDown: vi.fn((_event: KeyboardEvent) => undefined),
    handleFocus: vi.fn(),
    clearSearch: vi.fn(),
    closeDropdown: vi.fn(),
    selectResult: vi.fn(),
    ...overrides,
  };
}

function renderDialog(onClose = vi.fn()) {
  return {
    onClose,
    ...render(
      <MemoryRouter>
        <NavigationQuickLookupDialog onClose={onClose} />
      </MemoryRouter>
    ),
  };
}

describe('NavigationQuickLookupDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lookupStateRef.current = buildLookupState();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders a labelled dialog, focuses the search field, and hides background siblings', async () => {
    const outsideButton = document.createElement('button');
    outsideButton.textContent = 'Outside action';
    document.body.appendChild(outsideButton);

    const { unmount } = renderDialog();

    expect(await screen.findByRole('dialog', { name: /search people/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^search people$/i })).toHaveFocus();
    expect(outsideButton).toHaveAttribute('aria-hidden', 'true');
    expect(outsideButton).toHaveAttribute('inert');

    unmount();

    expect(outsideButton).not.toHaveAttribute('aria-hidden');
    expect(outsideButton).not.toHaveAttribute('inert');
  });

  it('traps focus inside the dialog', async () => {
    const user = userEvent.setup();
    renderDialog();

    const closeButton = await screen.findByRole('button', { name: /close search dialog/i });
    const viewAllPeopleLink = screen.getByRole('link', { name: /view all people/i });

    closeButton.focus();
    await user.tab({ shift: true });
    expect(viewAllPeopleLink).toHaveFocus();

    viewAllPeopleLink.focus();
    await user.tab();
    expect(closeButton).toHaveFocus();
  });

  it('closes from Escape and backdrop interactions', async () => {
    const { onClose } = renderDialog();

    const dialog = await screen.findByRole('dialog', { name: /search people/i });
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(dialog.parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('defaults to the first result, wraps keyboard selection, and navigates on Enter', async () => {
    renderDialog();

    const input = await screen.findByRole('combobox', { name: /search people/i });

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /alice rivera/i })).toHaveAttribute(
        'data-active',
        'true'
      );
    });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('link', { name: /alan stone/i })).toHaveAttribute('data-active', 'true');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('link', { name: /alice rivera/i })).toHaveAttribute(
      'data-active',
      'true'
    );

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getByRole('link', { name: /alan stone/i })).toHaveAttribute('data-active', 'true');

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(navigateMock).toHaveBeenCalledWith('/contacts/2');
  });
});
