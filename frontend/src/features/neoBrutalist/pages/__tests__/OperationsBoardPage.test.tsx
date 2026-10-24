import type * as ReactRouterDom from 'react-router-dom';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OperationsBoardPage from '../OperationsBoardPage';
import { renderWithProviders } from '../../../../test/testUtils';

let capturedDndProps: {
  onDragStart?: (event: unknown) => void;
  onDragEnd?: (event: unknown) => void;
  onDragCancel?: () => void;
} = {};

const { mockGetTasks, mockUpdateTaskStatus, mockLocation } = vi.hoisted(() => ({
  mockGetTasks: vi.fn(),
  mockUpdateTaskStatus: vi.fn(),
  mockLocation: { pathname: '/demo/operations' },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return {
    ...actual,
    useLocation: () => mockLocation,
  };
});

vi.mock('../../../../services/LoopApiService', () => ({
  default: {
    getTasks: mockGetTasks,
    updateTaskStatus: mockUpdateTaskStatus,
  },
}));

vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@dnd-kit/core');
  return {
    ...actual,
    DndContext: (props: {
      children: React.ReactNode;
      onDragStart?: (event: unknown) => void;
      onDragEnd?: (event: unknown) => void;
      onDragCancel?: () => void;
    }) => {
      capturedDndProps = props;
      return <div data-testid="mock-dnd-context">{props.children}</div>;
    },
  };
});

describe('OperationsBoardPage', () => {
  beforeEach(() => {
    mockGetTasks.mockReset();
    mockUpdateTaskStatus.mockReset();
    mockLocation.pathname = '/demo/operations';
    capturedDndProps = {};
    mockGetTasks.mockResolvedValue([
      {
        id: 'staff-task-1',
        title: 'Staff follow-up',
        category: 'admin',
        status: 'todo',
      },
      {
        id: 'staff-task-2',
        title: 'Review financials',
        category: 'finance',
        status: 'in-progress',
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

  it('fetches tasks on live operations route and displays them in columns', async () => {
    mockLocation.pathname = '/operations';
    renderWithProviders(<OperationsBoardPage />, {
      route: '/operations',
    });

    await waitFor(() => {
      expect(screen.getByText('Staff follow-up')).toBeInTheDocument();
    });

    expect(screen.getByText('Review financials')).toBeInTheDocument();
    expect(mockGetTasks).toHaveBeenCalledTimes(1);

    const todoColumn = screen.getByTestId('column-todo');
    expect(todoColumn).toHaveTextContent('Staff follow-up');

    const inProgressColumn = screen.getByTestId('column-in-progress');
    expect(inProgressColumn).toHaveTextContent('Review financials');
  });

  it('handles drag-and-drop between columns with optimistic update and API call', async () => {
    mockLocation.pathname = '/operations';
    mockUpdateTaskStatus.mockResolvedValue(undefined);

    renderWithProviders(<OperationsBoardPage />, {
      route: '/operations',
    });

    await waitFor(() => {
      expect(screen.getByText('Staff follow-up')).toBeInTheDocument();
    });

    expect(capturedDndProps.onDragEnd).toBeDefined();

    // Drag staff-task-1 from todo into in-progress column
    await act(async () => {
      capturedDndProps.onDragEnd?.({
        active: { id: 'staff-task-1' },
        over: { id: 'in-progress' },
      });
    });

    expect(mockUpdateTaskStatus).toHaveBeenCalledWith('staff-task-1', 'in-progress');

    // Both tasks are now in-progress
    const inProgressColumn = screen.getByTestId('column-in-progress');
    expect(inProgressColumn).toHaveTextContent('Staff follow-up');
    expect(inProgressColumn).toHaveTextContent('Review financials');
  });

  it('reverts optimistic update when updateTaskStatus API fails', async () => {
    mockLocation.pathname = '/operations';
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUpdateTaskStatus.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<OperationsBoardPage />, {
      route: '/operations',
    });

    await waitFor(() => {
      expect(screen.getByText('Staff follow-up')).toBeInTheDocument();
    });

    // Attempt drag from todo to done
    await act(async () => {
      capturedDndProps.onDragEnd?.({
        active: { id: 'staff-task-1' },
        over: { id: 'done' },
      });
    });

    await waitFor(() => {
      // Reverted back to todo
      const todoColumn = screen.getByTestId('column-todo');
      expect(todoColumn).toHaveTextContent('Staff follow-up');
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('updates task position when dropped over another task in a different column', async () => {
    mockLocation.pathname = '/operations';
    mockUpdateTaskStatus.mockResolvedValue(undefined);

    renderWithProviders(<OperationsBoardPage />, {
      route: '/operations',
    });

    await waitFor(() => {
      expect(screen.getByText('Staff follow-up')).toBeInTheDocument();
    });

    // Drag staff-task-1 (todo) over staff-task-2 (which is in-progress)
    await act(async () => {
      capturedDndProps.onDragEnd?.({
        active: { id: 'staff-task-1' },
        over: { id: 'staff-task-2' },
      });
    });

    expect(mockUpdateTaskStatus).toHaveBeenCalledWith('staff-task-1', 'in-progress');
  });

  it('filters tasks by category when filter menu option is selected', async () => {
    mockLocation.pathname = '/operations';
    renderWithProviders(<OperationsBoardPage />, {
      route: '/operations',
    });

    await waitFor(() => {
      expect(screen.getByText('Staff follow-up')).toBeInTheDocument();
    });

    // Open filter menu
    const filterBtn = screen.getByRole('button', { name: /^FILTER/i });
    fireEvent.click(filterBtn);

    // Click HR category
    const hrBtn = screen.getByRole('button', { name: /^HR$/i });
    fireEvent.click(hrBtn);

    // Both admin and finance tasks should now be filtered out
    expect(screen.queryByText('Staff follow-up')).not.toBeInTheDocument();
    expect(screen.queryByText('Review financials')).not.toBeInTheDocument();
  });
});

