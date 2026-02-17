import { describe, it, expect } from 'vitest';
import reducer, {
  clearSelectedTask,
  clearError,
  fetchTasks,
  fetchTaskById,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  fetchTaskSummary,
} from '../tasksSlice';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeTask = (overrides: Record<string, unknown> = {}) => ({
  id: 'task-1',
  title: 'Follow up call',
  description: null,
  status: 'pending',
  priority: 'medium',
  due_date: null,
  assigned_to: null,
  entity_type: null,
  entity_id: null,
  created_by: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const initialState = {
  tasks: [] as ReturnType<typeof makeTask>[],
  selectedTask: null as ReturnType<typeof makeTask> | null,
  summary: null as Record<string, unknown> | null,
  pagination: { page: 1, limit: 20, total: 0, pages: 0 },
  loading: false,
  error: null as string | null,
};

// ─── Reducers ─────────────────────────────────────────────────────────────────

describe('tasksSlice reducers', () => {
  it('clearSelectedTask sets selectedTask to null', () => {
    const state = reducer(
      { ...initialState, selectedTask: makeTask() as never },
      clearSelectedTask()
    );
    expect(state.selectedTask).toBeNull();
  });

  it('clearError sets error to null', () => {
    const state = reducer({ ...initialState, error: 'Something failed' }, clearError());
    expect(state.error).toBeNull();
  });
});

// ─── fetchTasks thunk ─────────────────────────────────────────────────────────

describe('fetchTasks thunk', () => {
  it('sets loading=true and clears error on pending', () => {
    const state = reducer(
      { ...initialState, error: 'old error' },
      { type: fetchTasks.pending.type }
    );
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('populates tasks, pagination, and summary on fulfilled', () => {
    const tasks = [makeTask()];
    const pagination = { page: 1, limit: 20, total: 1, pages: 1 };
    const summary = { total: 1, completed: 0, pending: 1 };
    const state = reducer(
      { ...initialState, loading: true },
      { type: fetchTasks.fulfilled.type, payload: { tasks, pagination, summary } }
    );
    expect(state.loading).toBe(false);
    expect(state.tasks).toHaveLength(1);
    expect(state.pagination.total).toBe(1);
    expect(state.summary).toEqual(summary);
  });

  it('sets error on rejected', () => {
    const state = reducer(
      { ...initialState, loading: true },
      { type: fetchTasks.rejected.type, error: { message: 'Network error' } }
    );
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Network error');
  });

  it('uses fallback error message', () => {
    const state = reducer(
      initialState,
      { type: fetchTasks.rejected.type, error: {} }
    );
    expect(state.error).toBe('Failed to fetch tasks');
  });
});

// ─── fetchTaskById thunk ──────────────────────────────────────────────────────

describe('fetchTaskById thunk', () => {
  it('sets loading on pending', () => {
    const state = reducer(initialState, { type: fetchTaskById.pending.type });
    expect(state.loading).toBe(true);
  });

  it('sets selectedTask on fulfilled', () => {
    const task = makeTask({ id: 'task-detail' });
    const state = reducer(
      { ...initialState, loading: true },
      { type: fetchTaskById.fulfilled.type, payload: task }
    );
    expect(state.loading).toBe(false);
    expect(state.selectedTask?.id).toBe('task-detail');
  });

  it('sets error on rejected', () => {
    const state = reducer(
      initialState,
      { type: fetchTaskById.rejected.type, error: { message: 'Not found' } }
    );
    expect(state.error).toBe('Not found');
  });
});

// ─── createTask thunk ─────────────────────────────────────────────────────────

describe('createTask thunk', () => {
  it('sets loading on pending', () => {
    const state = reducer(initialState, { type: createTask.pending.type });
    expect(state.loading).toBe(true);
  });

  it('prepends the new task to the list on fulfilled', () => {
    const existing = makeTask({ id: 'task-old' });
    const created = makeTask({ id: 'task-new' });
    const state = reducer(
      { ...initialState, tasks: [existing] as never[] },
      { type: createTask.fulfilled.type, payload: created }
    );
    expect(state.tasks[0].id).toBe('task-new');
    expect(state.tasks).toHaveLength(2);
  });

  it('sets error on rejected', () => {
    const state = reducer(
      initialState,
      { type: createTask.rejected.type, error: { message: 'Validation failed' } }
    );
    expect(state.error).toBe('Validation failed');
  });
});

// ─── updateTask thunk ─────────────────────────────────────────────────────────

describe('updateTask thunk', () => {
  it('replaces matching task in the list on fulfilled', () => {
    const original = makeTask({ title: 'Old Title' });
    const updated = makeTask({ title: 'New Title' });
    const state = reducer(
      { ...initialState, tasks: [original] as never[] },
      { type: updateTask.fulfilled.type, payload: updated }
    );
    expect(state.tasks[0].title).toBe('New Title');
  });

  it('also syncs selectedTask when IDs match', () => {
    const updated = makeTask({ title: 'Updated' });
    const state = reducer(
      { ...initialState, tasks: [makeTask()] as never[], selectedTask: makeTask() as never },
      { type: updateTask.fulfilled.type, payload: updated }
    );
    expect(state.selectedTask?.title).toBe('Updated');
  });

  it('does not sync selectedTask when IDs differ', () => {
    const selected = makeTask({ id: 'task-other', title: 'Other Task' });
    const updated = makeTask({ id: 'task-1', title: 'Changed' });
    const state = reducer(
      { ...initialState, tasks: [makeTask()] as never[], selectedTask: selected as never },
      { type: updateTask.fulfilled.type, payload: updated }
    );
    expect(state.selectedTask?.title).toBe('Other Task');
  });
});

// ─── deleteTask thunk ─────────────────────────────────────────────────────────

describe('deleteTask thunk', () => {
  it('sets loading on pending', () => {
    const state = reducer(initialState, { type: deleteTask.pending.type });
    expect(state.loading).toBe(true);
  });

  it('removes the task from the list on fulfilled', () => {
    const second = makeTask({ id: 'task-2' });
    const state = reducer(
      { ...initialState, tasks: [makeTask(), second] as never[] },
      { type: deleteTask.fulfilled.type, payload: 'task-1' }
    );
    expect(state.tasks).toHaveLength(1);
    expect(state.tasks[0].id).toBe('task-2');
  });

  it('clears selectedTask when the deleted task was selected', () => {
    const state = reducer(
      { ...initialState, tasks: [makeTask()] as never[], selectedTask: makeTask() as never },
      { type: deleteTask.fulfilled.type, payload: 'task-1' }
    );
    expect(state.selectedTask).toBeNull();
  });

  it('leaves selectedTask intact when a different task is deleted', () => {
    const selected = makeTask({ id: 'task-selected' });
    const state = reducer(
      { ...initialState, tasks: [makeTask()] as never[], selectedTask: selected as never },
      { type: deleteTask.fulfilled.type, payload: 'task-1' }
    );
    expect(state.selectedTask?.id).toBe('task-selected');
  });
});

// ─── completeTask thunk ───────────────────────────────────────────────────────

describe('completeTask thunk', () => {
  it('sets loading on pending', () => {
    const state = reducer(initialState, { type: completeTask.pending.type });
    expect(state.loading).toBe(true);
  });

  it('updates task status in list on fulfilled', () => {
    const original = makeTask({ status: 'pending' });
    const completed = makeTask({ status: 'completed' });
    const state = reducer(
      { ...initialState, tasks: [original] as never[] },
      { type: completeTask.fulfilled.type, payload: completed }
    );
    expect(state.tasks[0].status).toBe('completed');
  });

  it('also syncs selectedTask on complete', () => {
    const completed = makeTask({ status: 'completed' });
    const state = reducer(
      { ...initialState, tasks: [makeTask()] as never[], selectedTask: makeTask() as never },
      { type: completeTask.fulfilled.type, payload: completed }
    );
    expect(state.selectedTask?.status).toBe('completed');
  });

  it('sets error on rejected', () => {
    const state = reducer(
      initialState,
      { type: completeTask.rejected.type, error: { message: 'Already completed' } }
    );
    expect(state.error).toBe('Already completed');
  });
});

// ─── fetchTaskSummary thunk ───────────────────────────────────────────────────

describe('fetchTaskSummary thunk', () => {
  it('clears error on pending', () => {
    const state = reducer(
      { ...initialState, error: 'old error' },
      { type: fetchTaskSummary.pending.type }
    );
    expect(state.error).toBeNull();
  });

  it('sets summary on fulfilled', () => {
    const summary = { total: 15, pending: 10, completed: 5 };
    const state = reducer(
      initialState,
      { type: fetchTaskSummary.fulfilled.type, payload: summary }
    );
    expect(state.summary).toEqual(summary);
  });

  it('sets error on rejected', () => {
    const state = reducer(
      initialState,
      { type: fetchTaskSummary.rejected.type, error: { message: 'Fetch failed' } }
    );
    expect(state.error).toBe('Fetch failed');
  });
});
