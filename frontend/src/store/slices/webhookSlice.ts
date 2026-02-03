/**
 * Webhook Slice
 * Redux state management for webhooks and API keys
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import type {
  WebhookState,
  WebhookEndpoint,
  WebhookDelivery,
  WebhookEventInfo,
  ApiKey,
  ApiKeyUsage,
  ApiScopeInfo,
  CreateWebhookEndpointRequest,
  UpdateWebhookEndpointRequest,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  UpdateApiKeyRequest,
  WebhookTestResponse,
} from '../../types/webhook';

const initialState: WebhookState = {
  endpoints: [],
  selectedEndpoint: null,
  deliveries: [],
  availableEvents: [],
  apiKeys: [],
  selectedApiKey: null,
  apiKeyUsage: [],
  availableScopes: [],
  newApiKey: null,
  testResult: null,
  isLoading: false,
  isTesting: false,
  error: null,
};

// ==================== Webhook Endpoints ====================

/**
 * Fetch all webhook endpoints
 */
export const fetchWebhookEndpoints = createAsyncThunk<WebhookEndpoint[]>(
  'webhooks/fetchEndpoints',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/webhooks/endpoints');
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch webhook endpoints';
      return rejectWithValue(message);
    }
  }
);

/**
 * Create a new webhook endpoint
 */
export const createWebhookEndpoint = createAsyncThunk<
  WebhookEndpoint,
  CreateWebhookEndpointRequest
>(
  'webhooks/createEndpoint',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/webhooks/endpoints', data);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create webhook endpoint';
      return rejectWithValue(message);
    }
  }
);

/**
 * Update a webhook endpoint
 */
export const updateWebhookEndpoint = createAsyncThunk<
  WebhookEndpoint,
  { id: string; data: UpdateWebhookEndpointRequest }
>(
  'webhooks/updateEndpoint',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/webhooks/endpoints/${id}`, data);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update webhook endpoint';
      return rejectWithValue(message);
    }
  }
);

/**
 * Delete a webhook endpoint
 */
export const deleteWebhookEndpoint = createAsyncThunk<string, string>(
  'webhooks/deleteEndpoint',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/webhooks/endpoints/${id}`);
      return id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete webhook endpoint';
      return rejectWithValue(message);
    }
  }
);

/**
 * Regenerate webhook secret
 */
export const regenerateWebhookSecret = createAsyncThunk<
  { id: string; secret: string },
  string
>(
  'webhooks/regenerateSecret',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.post(`/webhooks/endpoints/${id}/regenerate-secret`);
      return { id, secret: response.data.secret };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to regenerate webhook secret';
      return rejectWithValue(message);
    }
  }
);

/**
 * Test a webhook endpoint
 */
export const testWebhookEndpoint = createAsyncThunk<WebhookTestResponse, string>(
  'webhooks/testEndpoint',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.post(`/webhooks/endpoints/${id}/test`);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to test webhook endpoint';
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch webhook deliveries for an endpoint
 */
export const fetchWebhookDeliveries = createAsyncThunk<
  WebhookDelivery[],
  { endpointId: string; limit?: number }
>(
  'webhooks/fetchDeliveries',
  async ({ endpointId, limit = 50 }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/webhooks/endpoints/${endpointId}/deliveries?limit=${limit}`);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch webhook deliveries';
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch available webhook events
 */
export const fetchAvailableWebhookEvents = createAsyncThunk<WebhookEventInfo[]>(
  'webhooks/fetchEvents',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/webhooks/events');
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch webhook events';
      return rejectWithValue(message);
    }
  }
);

// ==================== API Keys ====================

/**
 * Fetch all API keys
 */
export const fetchApiKeys = createAsyncThunk<ApiKey[]>(
  'webhooks/fetchApiKeys',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/webhooks/api-keys');
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch API keys';
      return rejectWithValue(message);
    }
  }
);

/**
 * Create a new API key
 */
export const createApiKey = createAsyncThunk<CreateApiKeyResponse, CreateApiKeyRequest>(
  'webhooks/createApiKey',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/webhooks/api-keys', data);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create API key';
      return rejectWithValue(message);
    }
  }
);

/**
 * Update an API key
 */
export const updateApiKey = createAsyncThunk<
  ApiKey,
  { id: string; data: UpdateApiKeyRequest }
>(
  'webhooks/updateApiKey',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/webhooks/api-keys/${id}`, data);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update API key';
      return rejectWithValue(message);
    }
  }
);

/**
 * Revoke an API key
 */
export const revokeApiKey = createAsyncThunk<string, string>(
  'webhooks/revokeApiKey',
  async (id, { rejectWithValue }) => {
    try {
      await api.post(`/webhooks/api-keys/${id}/revoke`);
      return id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to revoke API key';
      return rejectWithValue(message);
    }
  }
);

/**
 * Delete an API key
 */
export const deleteApiKey = createAsyncThunk<string, string>(
  'webhooks/deleteApiKey',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/webhooks/api-keys/${id}`);
      return id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete API key';
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch API key usage
 */
export const fetchApiKeyUsage = createAsyncThunk<
  ApiKeyUsage[],
  { keyId: string; limit?: number }
>(
  'webhooks/fetchApiKeyUsage',
  async ({ keyId, limit = 100 }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/webhooks/api-keys/${keyId}/usage?limit=${limit}`);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch API key usage';
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch available API scopes
 */
export const fetchAvailableScopes = createAsyncThunk<ApiScopeInfo[]>(
  'webhooks/fetchScopes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/webhooks/api-keys/scopes');
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch API scopes';
      return rejectWithValue(message);
    }
  }
);

const webhookSlice = createSlice({
  name: 'webhooks',
  initialState,
  reducers: {
    clearWebhookError: (state) => {
      state.error = null;
    },
    clearTestResult: (state) => {
      state.testResult = null;
    },
    clearNewApiKey: (state) => {
      state.newApiKey = null;
    },
    setSelectedEndpoint: (state, action) => {
      state.selectedEndpoint = action.payload;
    },
    setSelectedApiKey: (state, action) => {
      state.selectedApiKey = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch endpoints
    builder
      .addCase(fetchWebhookEndpoints.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWebhookEndpoints.fulfilled, (state, action) => {
        state.isLoading = false;
        state.endpoints = action.payload;
      })
      .addCase(fetchWebhookEndpoints.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create endpoint
    builder
      .addCase(createWebhookEndpoint.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createWebhookEndpoint.fulfilled, (state, action) => {
        state.isLoading = false;
        state.endpoints.unshift(action.payload);
      })
      .addCase(createWebhookEndpoint.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update endpoint
    builder
      .addCase(updateWebhookEndpoint.fulfilled, (state, action) => {
        const index = state.endpoints.findIndex((e) => e.id === action.payload.id);
        if (index !== -1) {
          state.endpoints[index] = action.payload;
        }
        if (state.selectedEndpoint?.id === action.payload.id) {
          state.selectedEndpoint = action.payload;
        }
      });

    // Delete endpoint
    builder
      .addCase(deleteWebhookEndpoint.fulfilled, (state, action) => {
        state.endpoints = state.endpoints.filter((e) => e.id !== action.payload);
        if (state.selectedEndpoint?.id === action.payload) {
          state.selectedEndpoint = null;
        }
      });

    // Regenerate secret
    builder
      .addCase(regenerateWebhookSecret.fulfilled, (state, action) => {
        const index = state.endpoints.findIndex((e) => e.id === action.payload.id);
        if (index !== -1) {
          state.endpoints[index].secret = action.payload.secret;
        }
        if (state.selectedEndpoint?.id === action.payload.id) {
          state.selectedEndpoint.secret = action.payload.secret;
        }
      });

    // Test endpoint
    builder
      .addCase(testWebhookEndpoint.pending, (state) => {
        state.isTesting = true;
        state.testResult = null;
      })
      .addCase(testWebhookEndpoint.fulfilled, (state, action) => {
        state.isTesting = false;
        state.testResult = action.payload;
      })
      .addCase(testWebhookEndpoint.rejected, (state, action) => {
        state.isTesting = false;
        state.testResult = {
          success: false,
          error: action.payload as string,
        };
      });

    // Fetch deliveries
    builder
      .addCase(fetchWebhookDeliveries.fulfilled, (state, action) => {
        state.deliveries = action.payload;
      });

    // Fetch available events
    builder
      .addCase(fetchAvailableWebhookEvents.fulfilled, (state, action) => {
        state.availableEvents = action.payload;
      });

    // Fetch API keys
    builder
      .addCase(fetchApiKeys.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchApiKeys.fulfilled, (state, action) => {
        state.isLoading = false;
        state.apiKeys = action.payload;
      })
      .addCase(fetchApiKeys.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create API key
    builder
      .addCase(createApiKey.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.newApiKey = null;
      })
      .addCase(createApiKey.fulfilled, (state, action) => {
        state.isLoading = false;
        state.newApiKey = action.payload;
        // Add to list (without the key value)
        const apiKeyWithoutKey = { ...action.payload };
        delete (apiKeyWithoutKey as { key?: string }).key;
        state.apiKeys.unshift(apiKeyWithoutKey as ApiKey);
      })
      .addCase(createApiKey.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update API key
    builder
      .addCase(updateApiKey.fulfilled, (state, action) => {
        const index = state.apiKeys.findIndex((k) => k.id === action.payload.id);
        if (index !== -1) {
          state.apiKeys[index] = action.payload;
        }
        if (state.selectedApiKey?.id === action.payload.id) {
          state.selectedApiKey = action.payload;
        }
      });

    // Revoke API key
    builder
      .addCase(revokeApiKey.fulfilled, (state, action) => {
        const index = state.apiKeys.findIndex((k) => k.id === action.payload);
        if (index !== -1) {
          state.apiKeys[index].status = 'revoked';
        }
        if (state.selectedApiKey?.id === action.payload) {
          state.selectedApiKey.status = 'revoked';
        }
      });

    // Delete API key
    builder
      .addCase(deleteApiKey.fulfilled, (state, action) => {
        state.apiKeys = state.apiKeys.filter((k) => k.id !== action.payload);
        if (state.selectedApiKey?.id === action.payload) {
          state.selectedApiKey = null;
        }
      });

    // Fetch API key usage
    builder
      .addCase(fetchApiKeyUsage.fulfilled, (state, action) => {
        state.apiKeyUsage = action.payload;
      });

    // Fetch available scopes
    builder
      .addCase(fetchAvailableScopes.fulfilled, (state, action) => {
        state.availableScopes = action.payload;
      });
  },
});

export const {
  clearWebhookError,
  clearTestResult,
  clearNewApiKey,
  setSelectedEndpoint,
  setSelectedApiKey,
} = webhookSlice.actions;

export default webhookSlice.reducer;
