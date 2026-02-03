/**
 * Dashboard Redux Slice
 * State management for customizable dashboard
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import type {
  DashboardConfig,
  DashboardWidget,
  WidgetLayout,
} from '../../types/dashboard';
import { DEFAULT_DASHBOARD_CONFIG } from '../../types/dashboard';

interface DashboardState {
  currentDashboard: DashboardConfig | null;
  dashboards: DashboardConfig[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  editMode: boolean;
}

const initialState: DashboardState = {
  currentDashboard: null,
  dashboards: [],
  loading: false,
  saving: false,
  error: null,
  editMode: false,
};

/**
 * Fetch user's dashboard configurations
 */
export const fetchDashboards = createAsyncThunk(
  'dashboard/fetchDashboards',
  async () => {
    const response = await api.get<DashboardConfig[]>('/dashboard/configs');
    return response.data;
  }
);

/**
 * Fetch a specific dashboard configuration
 */
export const fetchDashboard = createAsyncThunk(
  'dashboard/fetchDashboard',
  async (dashboardId: string) => {
    const response = await api.get<DashboardConfig>(`/dashboard/configs/${dashboardId}`);
    return response.data;
  }
);

/**
 * Fetch user's default dashboard (or create it)
 */
export const fetchDefaultDashboard = createAsyncThunk(
  'dashboard/fetchDefaultDashboard',
  async () => {
    const response = await api.get<DashboardConfig>('/dashboard/configs/default');
    return response.data;
  }
);

/**
 * Create a new dashboard configuration
 */
export const createDashboard = createAsyncThunk(
  'dashboard/createDashboard',
  async (config: Omit<DashboardConfig, 'id' | 'created_at' | 'updated_at'>) => {
    const response = await api.post<DashboardConfig>('/dashboard/configs', config);
    return response.data;
  }
);

/**
 * Update dashboard configuration
 */
export const updateDashboard = createAsyncThunk(
  'dashboard/updateDashboard',
  async ({ id, config }: { id: string; config: Partial<DashboardConfig> }) => {
    const response = await api.put<DashboardConfig>(`/dashboard/configs/${id}`, config);
    return response.data;
  }
);

/**
 * Delete dashboard configuration
 */
export const deleteDashboard = createAsyncThunk(
  'dashboard/deleteDashboard',
  async (dashboardId: string) => {
    await api.delete(`/dashboard/configs/${dashboardId}`);
    return dashboardId;
  }
);

/**
 * Save dashboard layout
 */
export const saveDashboardLayout = createAsyncThunk(
  'dashboard/saveDashboardLayout',
  async ({ id, layout }: { id: string; layout: WidgetLayout[] }) => {
    const response = await api.put<DashboardConfig>(`/dashboard/configs/${id}/layout`, { layout });
    return response.data;
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setEditMode: (state, action: PayloadAction<boolean>) => {
      state.editMode = action.payload;
    },

    updateLayout: (state, action: PayloadAction<WidgetLayout[]>) => {
      if (state.currentDashboard) {
        state.currentDashboard.layout = action.payload;
        // Update widget layouts
        state.currentDashboard.widgets = state.currentDashboard.widgets.map((widget) => {
          const newLayout = action.payload.find((l) => l.i === widget.id);
          if (newLayout) {
            return { ...widget, layout: newLayout };
          }
          return widget;
        });
      }
    },

    addWidget: (state, action: PayloadAction<DashboardWidget>) => {
      if (state.currentDashboard) {
        state.currentDashboard.widgets.push(action.payload);
        state.currentDashboard.layout.push(action.payload.layout);
      }
    },

    removeWidget: (state, action: PayloadAction<string>) => {
      if (state.currentDashboard) {
        state.currentDashboard.widgets = state.currentDashboard.widgets.filter(
          (w) => w.id !== action.payload
        );
        state.currentDashboard.layout = state.currentDashboard.layout.filter(
          (l) => l.i !== action.payload
        );
      }
    },

    toggleWidget: (state, action: PayloadAction<string>) => {
      if (state.currentDashboard) {
        const widget = state.currentDashboard.widgets.find((w) => w.id === action.payload);
        if (widget) {
          widget.enabled = !widget.enabled;
        }
      }
    },

    updateWidgetSettings: (
      state,
      action: PayloadAction<{ widgetId: string; settings: Record<string, any> }>
    ) => {
      if (state.currentDashboard) {
        const widget = state.currentDashboard.widgets.find((w) => w.id === action.payload.widgetId);
        if (widget) {
          widget.settings = { ...widget.settings, ...action.payload.settings };
        }
      }
    },

    resetToDefault: (state) => {
      if (state.currentDashboard) {
        const userId = state.currentDashboard.user_id;
        const dashboardId = state.currentDashboard.id;
        state.currentDashboard = {
          ...DEFAULT_DASHBOARD_CONFIG,
          id: dashboardId,
          user_id: userId,
        } as DashboardConfig;
      }
    },

    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch dashboards
      .addCase(fetchDashboards.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboards.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboards = action.payload;
        // Set the default dashboard as current if no current dashboard
        if (!state.currentDashboard) {
          const defaultDashboard = action.payload.find((d) => d.is_default);
          if (defaultDashboard) {
            state.currentDashboard = defaultDashboard;
          } else if (action.payload.length > 0) {
            state.currentDashboard = action.payload[0];
          }
        }
      })
      .addCase(fetchDashboards.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch dashboards';
      })

      // Fetch default dashboard
      .addCase(fetchDefaultDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDefaultDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDashboard = action.payload;
        const exists = state.dashboards.find((d) => d.id === action.payload.id);
        if (!exists) {
          state.dashboards.push(action.payload);
        }
      })
      .addCase(fetchDefaultDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch default dashboard';
      })

      // Fetch specific dashboard
      .addCase(fetchDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDashboard = action.payload;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch dashboard';
      })

      // Create dashboard
      .addCase(createDashboard.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createDashboard.fulfilled, (state, action) => {
        state.saving = false;
        state.dashboards.push(action.payload);
        state.currentDashboard = action.payload;
      })
      .addCase(createDashboard.rejected, (state, action) => {
        state.saving = false;
        state.error = action.error.message || 'Failed to create dashboard';
      })

      // Update dashboard
      .addCase(updateDashboard.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateDashboard.fulfilled, (state, action) => {
        state.saving = false;
        const index = state.dashboards.findIndex((d) => d.id === action.payload.id);
        if (index !== -1) {
          state.dashboards[index] = action.payload;
        }
        if (state.currentDashboard?.id === action.payload.id) {
          state.currentDashboard = action.payload;
        }
      })
      .addCase(updateDashboard.rejected, (state, action) => {
        state.saving = false;
        state.error = action.error.message || 'Failed to update dashboard';
      })

      // Delete dashboard
      .addCase(deleteDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboards = state.dashboards.filter((d: DashboardConfig) => d.id !== action.payload);
        if (state.currentDashboard?.id === action.payload) {
          // Switch to default dashboard
          const defaultDashboard = state.dashboards.find((d: DashboardConfig) => d.is_default);
          state.currentDashboard = defaultDashboard || null;
        }
      })
      .addCase(deleteDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete dashboard';
      })

      // Save layout
      .addCase(saveDashboardLayout.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveDashboardLayout.fulfilled, (state, action) => {
        state.saving = false;
        if (state.currentDashboard) {
          state.currentDashboard.layout = action.payload.layout;
        }
      })
      .addCase(saveDashboardLayout.rejected, (state, action) => {
        state.saving = false;
        state.error = action.error.message || 'Failed to save layout';
      });
  },
});

export const {
  setEditMode,
  updateLayout,
  addWidget,
  removeWidget,
  toggleWidget,
  updateWidgetSettings,
  resetToDefault,
  clearError,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
