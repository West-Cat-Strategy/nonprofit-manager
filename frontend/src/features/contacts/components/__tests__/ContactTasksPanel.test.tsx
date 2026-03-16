import { fireEvent, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ContactTasksPanel from '../ContactTasksPanel';
import { renderWithProviders } from '../../../../test/testUtils';

const listTasksMock = vi.fn();
const createTaskMock = vi.fn();
const showErrorMock = vi.fn();
const showSuccessMock = vi.fn();

vi.mock('../../../tasks/api/tasksApiClient', () => ({
  tasksApiClient: {
    listTasks: (...args: unknown[]) => listTasksMock(...args),
    createTask: (...args: unknown[]) => createTaskMock(...args),
  },
}));

vi.mock('../../../../contexts/useToast', () => ({
  useToast: () => ({
    showError: showErrorMock,
    showSuccess: showSuccessMock,
  }),
}));

const emptyPayload = {
  tasks: [],
  pagination: { page: 1, limit: 25, total: 0, pages: 0 },
  summary: {
    total: 0,
    overdue: 0,
    due_today: 0,
    due_this_week: 0,
    by_status: {
      not_started: 0,
      in_progress: 0,
      waiting: 0,
      completed: 0,
      deferred: 0,
      cancelled: 0,
    },
    by_priority: {
      low: 0,
      normal: 0,
      high: 0,
      urgent: 0,
    },
  },
};

describe('ContactTasksPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listTasksMock.mockResolvedValue(emptyPayload);
  });

  it('renders the empty state for contacts with no tasks', async () => {
    renderWithProviders(<ContactTasksPanel contactId="contact-1" />);

    expect(await screen.findByText(/no tasks yet/i)).toBeInTheDocument();
    expect(listTasksMock).toHaveBeenCalledWith({
      related_to_type: 'contact',
      related_to_id: 'contact-1',
      limit: 25,
    });
  });

  it('creates tasks with ISO-normalized due dates', async () => {
    const createdTask = {
      id: 'task-1',
      subject: 'Call back about intake',
      description: 'Confirm the next steps',
      status: 'not_started',
      priority: 'high',
      due_date: new Date('2026-03-16T09:30').toISOString(),
      completed_date: null,
      assigned_to: null,
      related_to_type: 'contact',
      related_to_id: 'contact-1',
      created_at: '2026-03-15T00:00:00.000Z',
      updated_at: '2026-03-15T00:00:00.000Z',
      created_by: null,
      modified_by: null,
    };

    listTasksMock
      .mockResolvedValueOnce(emptyPayload)
      .mockResolvedValueOnce({
        ...emptyPayload,
        tasks: [createdTask],
        pagination: { page: 1, limit: 25, total: 1, pages: 1 },
      });
    createTaskMock.mockResolvedValue(createdTask);

    renderWithProviders(<ContactTasksPanel contactId="contact-1" />);

    fireEvent.click(await screen.findByRole('button', { name: /new task/i }));
    fireEvent.change(screen.getByLabelText(/subject/i), {
      target: { value: 'Call back about intake' },
    });
    fireEvent.change(screen.getByLabelText(/details/i), {
      target: { value: 'Confirm the next steps' },
    });
    fireEvent.change(screen.getByLabelText(/due date/i), {
      target: { value: '2026-03-16T09:30' },
    });
    fireEvent.change(screen.getByLabelText(/priority/i), {
      target: { value: 'high' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create task/i }));

    await waitFor(() => {
      expect(createTaskMock).toHaveBeenCalledWith({
        subject: 'Call back about intake',
        description: 'Confirm the next steps',
        priority: 'high',
        due_date: new Date('2026-03-16T09:30').toISOString(),
        related_to_type: 'contact',
        related_to_id: 'contact-1',
      });
    });

    expect(await screen.findByText(/call back about intake/i)).toBeInTheDocument();
    expect(showSuccessMock).toHaveBeenCalledWith('Task created');
  });

  it('shows a retry state when the task list fails to load', async () => {
    listTasksMock
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(emptyPayload);

    renderWithProviders(<ContactTasksPanel contactId="contact-1" />);

    expect(await screen.findByText(/failed to load tasks for this contact/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(listTasksMock).toHaveBeenCalledTimes(2);
    });
  });
});
