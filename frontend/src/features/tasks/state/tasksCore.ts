import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { tasksApiClient } from '../api/tasksApiClient';
import type { CreateTaskDTO, Task, TaskFilters, TaskSummary, UpdateTaskDTO } from '../types/contracts';

export type { Task, CreateTaskDTO, UpdateTaskDTO, TaskFilters, TaskSummary };

interface TasksState {
  tasks: Task[];
  selectedTask: Task | null;
  summary: TaskSummary | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  loading: boolean;
  error: string | null;
}

const initialState: TasksState = {
  tasks: [],
  selectedTask: null,
  summary: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  loading: false,
  error: null,
};

export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (filters: TaskFilters = {}) => {
    return tasksApiClient.listTasks(filters);
  }
);

export const fetchTaskById = createAsyncThunk(
  'tasks/fetchTaskById',
  async (id: string) => {
    return tasksApiClient.getTaskById(id);
  }
);

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (taskData: CreateTaskDTO) => {
    return tasksApiClient.createTask(taskData);
  }
);

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ id, updates }: { id: string; updates: UpdateTaskDTO }) => {
    return tasksApiClient.updateTask(id, updates);
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (id: string) => {
    await tasksApiClient.deleteTask(id);
    return id;
  }
);

export const completeTask = createAsyncThunk(
  'tasks/completeTask',
  async (id: string) => {
    return tasksApiClient.completeTask(id);
  }
);

export const fetchTaskSummary = createAsyncThunk(
  'tasks/fetchTaskSummary',
  async (filters: TaskFilters = {}) => {
    return tasksApiClient.getTaskSummary(filters);
  }
);

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    clearSelectedTask: (state) => {
      state.selectedTask = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload.tasks;
        state.pagination = action.payload.pagination;
        state.summary = action.payload.summary;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch tasks';
      })
      .addCase(fetchTaskById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTaskById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedTask = action.payload;
      })
      .addCase(fetchTaskById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch task';
      })
      .addCase(createTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks.unshift(action.payload);
      })
      .addCase(createTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create task';
      })
      .addCase(updateTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.tasks.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
        if (state.selectedTask?.id === action.payload.id) {
          state.selectedTask = action.payload;
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update task';
      })
      .addCase(deleteTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = state.tasks.filter((t) => t.id !== action.payload);
        if (state.selectedTask?.id === action.payload) {
          state.selectedTask = null;
        }
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete task';
      })
      .addCase(completeTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(completeTask.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.tasks.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
        if (state.selectedTask?.id === action.payload.id) {
          state.selectedTask = action.payload;
        }
      })
      .addCase(completeTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to complete task';
      })
      .addCase(fetchTaskSummary.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchTaskSummary.fulfilled, (state, action) => {
        state.summary = action.payload;
      })
      .addCase(fetchTaskSummary.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch task summary';
      });
  },
});

export const { clearSelectedTask, clearError } = tasksSlice.actions;
export default tasksSlice.reducer;
