/**
 * Alerts Redux Slice
 * State management for analytics alert configuration
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import type {
  AlertConfig,
  AlertInstance,
  AlertStats,
  AlertHistory,
  CreateAlertDTO,
  UpdateAlertDTO,
  AlertTestResult,
} from '../../types/alert';

interface AlertsState {
  configs: AlertConfig[];
  currentConfig: AlertConfig | null;
  instances: AlertInstance[];
  history: AlertHistory[];
  stats: AlertStats | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: AlertsState = {
  configs: [],
  currentConfig: null,
  instances: [],
  history: [],
  stats: null,
  loading: false,
  saving: false,
  error: null,
};

/**
 * Fetch all alert configurations
 */
export const fetchAlertConfigs = createAsyncThunk('alerts/fetchConfigs', async () => {
  const response = await api.get<AlertConfig[]>('/alerts/configs');
  return response.data;
});

/**
 * Fetch a specific alert configuration
 */
export const fetchAlertConfig = createAsyncThunk('alerts/fetchConfig', async (id: string) => {
  const response = await api.get<AlertConfig>(`/alerts/configs/${id}`);
  return response.data;
});

/**
 * Create new alert configuration
 */
export const createAlertConfig = createAsyncThunk(
  'alerts/createConfig',
  async (config: CreateAlertDTO) => {
    const response = await api.post<AlertConfig>('/alerts/configs', config);
    return response.data;
  }
);

/**
 * Update alert configuration
 */
export const updateAlertConfig = createAsyncThunk(
  'alerts/updateConfig',
  async ({ id, config }: { id: string; config: UpdateAlertDTO }) => {
    const response = await api.put<AlertConfig>(`/alerts/configs/${id}`, config);
    return response.data;
  }
);

/**
 * Delete alert configuration
 */
export const deleteAlertConfig = createAsyncThunk('alerts/deleteConfig', async (id: string) => {
  await api.delete(`/alerts/configs/${id}`);
  return id;
});

/**
 * Toggle alert enabled status
 */
export const toggleAlertConfig = createAsyncThunk('alerts/toggleConfig', async (id: string) => {
  const response = await api.patch<AlertConfig>(`/alerts/configs/${id}/toggle`);
  return response.data;
});

/**
 * Test alert configuration
 */
export const testAlertConfig = createAsyncThunk(
  'alerts/testConfig',
  async (config: CreateAlertDTO) => {
    const response = await api.post<AlertTestResult>('/alerts/test', config);
    return response.data;
  }
);

/**
 * Fetch alert instances (triggered alerts)
 */
export const fetchAlertInstances = createAsyncThunk(
  'alerts/fetchInstances',
  async (filters?: { status?: string; severity?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await api.get<AlertInstance[]>(`/alerts/instances?${params.toString()}`);
    return response.data;
  }
);

/**
 * Acknowledge alert instance
 */
export const acknowledgeAlert = createAsyncThunk('alerts/acknowledge', async (id: string) => {
  const response = await api.patch<AlertInstance>(`/alerts/instances/${id}/acknowledge`);
  return response.data;
});

/**
 * Resolve alert instance
 */
export const resolveAlert = createAsyncThunk('alerts/resolve', async (id: string) => {
  const response = await api.patch<AlertInstance>(`/alerts/instances/${id}/resolve`);
  return response.data;
});

/**
 * Fetch alert statistics
 */
export const fetchAlertStats = createAsyncThunk('alerts/fetchStats', async () => {
  const response = await api.get<AlertStats>('/alerts/stats');
  return response.data;
});

/**
 * Fetch alert history
 */
export const fetchAlertHistory = createAsyncThunk(
  'alerts/fetchHistory',
  async (params?: { days?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.days) queryParams.append('days', params.days.toString());

    const response = await api.get<AlertHistory[]>(`/alerts/history?${queryParams.toString()}`);
    return response.data;
  }
);

const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentConfig: (state, action: PayloadAction<AlertConfig | null>) => {
      state.currentConfig = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch alert configs
      .addCase(fetchAlertConfigs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAlertConfigs.fulfilled, (state, action) => {
        state.loading = false;
        state.configs = action.payload;
      })
      .addCase(fetchAlertConfigs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch alert configurations';
      })

      // Fetch single config
      .addCase(fetchAlertConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAlertConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.currentConfig = action.payload;
      })
      .addCase(fetchAlertConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch alert configuration';
      })

      // Create config
      .addCase(createAlertConfig.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createAlertConfig.fulfilled, (state, action) => {
        state.saving = false;
        state.configs.push(action.payload);
        state.currentConfig = action.payload;
      })
      .addCase(createAlertConfig.rejected, (state, action) => {
        state.saving = false;
        state.error = action.error.message || 'Failed to create alert configuration';
      })

      // Update config
      .addCase(updateAlertConfig.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateAlertConfig.fulfilled, (state, action) => {
        state.saving = false;
        const index = state.configs.findIndex((c: AlertConfig) => c.id === action.payload.id);
        if (index !== -1) {
          state.configs[index] = action.payload;
        }
        if (state.currentConfig?.id === action.payload.id) {
          state.currentConfig = action.payload;
        }
      })
      .addCase(updateAlertConfig.rejected, (state, action) => {
        state.saving = false;
        state.error = action.error.message || 'Failed to update alert configuration';
      })

      // Delete config
      .addCase(deleteAlertConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAlertConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.configs = state.configs.filter((c: AlertConfig) => c.id !== action.payload);
        if (state.currentConfig?.id === action.payload) {
          state.currentConfig = null;
        }
      })
      .addCase(deleteAlertConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete alert configuration';
      })

      // Toggle config
      .addCase(toggleAlertConfig.fulfilled, (state, action) => {
        const index = state.configs.findIndex((c: AlertConfig) => c.id === action.payload.id);
        if (index !== -1) {
          state.configs[index] = action.payload;
        }
        if (state.currentConfig?.id === action.payload.id) {
          state.currentConfig = action.payload;
        }
      })

      // Fetch instances
      .addCase(fetchAlertInstances.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAlertInstances.fulfilled, (state, action) => {
        state.loading = false;
        state.instances = action.payload;
      })
      .addCase(fetchAlertInstances.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch alert instances';
      })

      // Acknowledge alert
      .addCase(acknowledgeAlert.fulfilled, (state, action) => {
        const index = state.instances.findIndex((i: AlertInstance) => i.id === action.payload.id);
        if (index !== -1) {
          state.instances[index] = action.payload;
        }
      })

      // Resolve alert
      .addCase(resolveAlert.fulfilled, (state, action) => {
        const index = state.instances.findIndex((i: AlertInstance) => i.id === action.payload.id);
        if (index !== -1) {
          state.instances[index] = action.payload;
        }
      })

      // Fetch stats
      .addCase(fetchAlertStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })

      // Fetch history
      .addCase(fetchAlertHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAlertHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.history = action.payload;
      })
      .addCase(fetchAlertHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch alert history';
      });
  },
});

export const { clearError, setCurrentConfig } = alertsSlice.actions;

export default alertsSlice.reducer;
