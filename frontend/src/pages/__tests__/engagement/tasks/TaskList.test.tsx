import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import TaskList from '../../../engagement/tasks/TaskList';
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
  useAppSelector: (selector: (s: any) => any) => selector(state),
}));

vi.mock('../../../../store/slices/tasksSlice', () => ({
  default: (state = { tasks: [], pagination: { total: 0, page: 1, limit: 20, total_pages: 1 }, summary: null, loading: false, error: null }) => state,
  fetchTasks: (payload: any) => ({ type: 'tasks/fetch', payload }),
  deleteTask: (id: string) => ({ type: 'tasks/delete', payload: id }),
  completeTask: (id: string) => ({ type: 'tasks/complete', payload: id }),
}));

vi.mock('../../../../components/neo-brutalist/NeoBrutalistLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('../../../../hooks/useConfirmDialog', () => ({
  default: () => ({ dialogState: { isOpen: false }, confirm: vi.fn().mockResolvedValue(false), handleConfirm: vi.fn(), handleCancel: vi.fn() }),
  confirmPresets: { delete: () => ({ title: 'Delete' }) },
}));
vi.mock('../../../../components/ConfirmDialog', () => ({ default: () => null }));

describe('TaskList page', () => {
  it('renders tasks heading and quick filters', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskList />);
    expect(screen.getByRole('heading', { name: 'Tasks' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Overdue' }));
    expect(dispatchMock).toHaveBeenCalled();
  });
});
