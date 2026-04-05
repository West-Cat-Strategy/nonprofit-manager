import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import CaseRelationships from '../CaseRelationships';

const dispatchMock = vi.hoisted(() => vi.fn());
const listCasesMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    cases: [
      {
        id: '44444444-4444-4444-8444-444444444444',
        case_number: 'CASE-100',
        title: 'Current Case',
      },
      {
        id: '55555555-5555-4555-8555-555555555555',
        case_number: 'CASE-200',
        title: 'East Shelter',
      },
    ],
  })
);

vi.mock('../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: { cases: { caseRelationships: unknown[] } }) => unknown) =>
    selector({ cases: { caseRelationships: [] } }),
}));

vi.mock('../../../features/cases/api/casesApiClient', () => ({
  casesApiClient: {
    listCases: (...args: unknown[]) => listCasesMock(...args),
  },
}));

vi.mock('../../../hooks/useConfirmDialog', () => ({
  default: () => ({
    dialogState: {
      isOpen: false,
      title: '',
      message: '',
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      variant: 'info',
    },
    confirm: vi.fn(() => Promise.resolve(true)),
    handleConfirm: vi.fn(),
    handleCancel: vi.fn(),
  }),
  confirmPresets: {
    delete: (label: string) => ({
      title: `Delete ${label}`,
      message: `Delete ${label}?`,
      confirmLabel: 'Delete',
      variant: 'danger' as const,
    }),
  },
}));

vi.mock('../../../components/ConfirmDialog', () => ({
  default: () => null,
}));

vi.mock('../../neo-brutalist', () => ({
  BrutalButton: ({
    children,
    onClick,
    ...props
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
  BrutalCard: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  BrutalBadge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

describe('CaseRelationships', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    listCasesMock.mockClear();
  });

  it('searches cases through the canonical cases client and filters the current case out', async () => {
    render(<CaseRelationships caseId="44444444-4444-4444-8444-444444444444" />);

    fireEvent.click(screen.getByRole('button', { name: /add relationship/i }));
    fireEvent.change(screen.getByLabelText(/search case/i), {
      target: { value: 'housing support' },
    });

    await waitFor(() => {
      expect(listCasesMock).toHaveBeenCalledWith({
        search: 'housing support',
        limit: 5,
      });
    });

    expect(await screen.findByRole('button', { name: /CASE-200.*East Shelter/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /CASE-100.*Current Case/i })).not.toBeInTheDocument();
  });
});
