import { fireEvent, screen } from '@testing-library/react';
import { act, type ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import TaskList from '../TaskListPage';
import { renderWithProviders } from '../../../../test/testUtils';

const dispatchMock = vi.fn();
const state = {
  tasks: {
    tasks: [],
    pagination: { total: 0, page: 1, limit: 20, total_pages: 1 },
    summary: { overdue: 0, due_today: 0, due_this_week: 0 },
    loading: false,
    error: null,
  },
};

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (s: typeof state) => unknown) => selector(state),
}));

vi.mock('../../../../features/tasks/state', () => ({
  default: (state = { tasks: [], pagination: { total: 0, page: 1, limit: 20, total_pages: 1 }, summary: null, loading: false, error: null }) => state,
  fetchTasks: (payload: unknown) => ({ type: 'tasks/fetch', payload }),
  deleteTask: (id: string) => ({ type: 'tasks/delete', payload: id }),
  completeTask: (id: string) => ({ type: 'tasks/complete', payload: id }),
}));

vi.mock('../../../../components/neo-brutalist/NeoBrutalistLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('../../../../hooks/useConfirmDialog', () => ({
  default: () => ({ dialogState: { isOpen: false }, confirm: vi.fn().mockResolvedValue(false), handleConfirm: vi.fn(), handleCancel: vi.fn() }),
  confirmPresets: { delete: () => ({ title: 'Delete' }) },
}));
vi.mock('../../../../components/ConfirmDialog', () => ({ default: () => null }));

describe('TaskList page', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders tasks heading and quick filters', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskList />);
    expect(screen.getByRole('heading', { name: 'Tasks' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Overdue' }));
    expect(dispatchMock).toHaveBeenCalled();
  });

  it('sanitizes stale local storage filters before dispatching the initial load', () => {
    localStorage.setItem(
      'tasks_list_filters_v1',
      JSON.stringify({
        search: 'follow up',
        status: 'paused',
        priority: 'critical',
        overdue: 'yes',
        page: 9,
      })
    );

    renderWithProviders(<TaskList />, { route: '/tasks' });

    expect(dispatchMock).toHaveBeenCalledWith({
      type: 'tasks/fetch',
      payload: {
        search: 'follow up',
        status: undefined,
        priority: undefined,
        overdue: false,
        page: 1,
      },
    });
  });

  it('debounces free-text search before dispatching another fetch', async () => {
    vi.useFakeTimers();

    renderWithProviders(<TaskList />);

    const getFetchActions = () =>
      dispatchMock.mock.calls
        .map(([action]) => action)
        .filter((action) => action.type === 'tasks/fetch');

    expect(getFetchActions()).toHaveLength(1);

    dispatchMock.mockClear();

    const searchInput = screen.getByLabelText('Search tasks');
    fireEvent.change(searchInput, { target: { value: 'g' } });
    fireEvent.change(searchInput, { target: { value: 'gr' } });
    fireEvent.change(searchInput, { target: { value: 'gra' } });
    fireEvent.change(searchInput, { target: { value: 'grant' } });

    expect(getFetchActions()).toHaveLength(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(getFetchActions()).toHaveLength(1);
    expect(getFetchActions()[0]).toEqual({
      type: 'tasks/fetch',
      payload: {
        search: 'grant',
        status: undefined,
        priority: undefined,
        overdue: false,
        page: 1,
      },
    });

    vi.useRealTimers();
  });

  it('renders navigation actions as links while keeping mutation actions as buttons', () => {
    state.tasks.tasks = [
      {
        id: 'task-1',
        subject: 'Call donor',
        description: null,
        status: 'in_progress',
        priority: 'high',
        due_date: null,
        completed_date: null,
        assigned_to: null,
        assigned_to_name: 'Alex Rivera',
        related_to_type: null,
        related_to_id: null,
        related_to_name: null,
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-01T00:00:00.000Z',
        created_by: null,
        modified_by: null,
      },
    ];

    renderWithProviders(<TaskList />);

    expect(screen.getAllByRole('link', { name: 'View' })[0]).toHaveAttribute(
      'href',
      '/tasks/task-1'
    );
    expect(screen.getAllByRole('link', { name: 'Edit' })[0]).toHaveAttribute(
      'href',
      '/tasks/task-1/edit'
    );
    expect(screen.getAllByRole('button', { name: 'Complete' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Delete' }).length).toBeGreaterThan(0);

    state.tasks.tasks = [];
  });
});
