import type * as ReactRouterDom from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OperationsBoardPage from '../OperationsBoardPage';
import { renderWithProviders } from '../../../../test/testUtils';

const { mockGetTasks } = vi.hoisted(() => ({
  mockGetTasks: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({ pathname: '/demo/operations' }),
  };
});

vi.mock('../../../../services/LoopApiService', () => ({
  default: {
    getTasks: mockGetTasks,
  },
}));

describe('OperationsBoardPage', () => {
  beforeEach(() => {
    mockGetTasks.mockReset();
    mockGetTasks.mockResolvedValue([
      {
        id: 'staff-task-1',
        title: 'Staff follow-up',
        category: 'admin',
        status: 'todo',
      },
    ]);
  });

  it('renders deterministic demo tasks without calling the staff task API', async () => {
    renderWithProviders(<OperationsBoardPage />, {
      route: '/demo/operations',
    });

    await waitFor(() => {
      expect(screen.getByText('Demo inbox triage')).toBeInTheDocument();
    });

    expect(screen.getByText('Demo donor follow-up')).toBeInTheDocument();
    expect(screen.getByText('Demo volunteer roster refresh')).toBeInTheDocument();
    expect(screen.getByText('Demo site health check')).toBeInTheDocument();
    expect(mockGetTasks).not.toHaveBeenCalled();
  });
});
