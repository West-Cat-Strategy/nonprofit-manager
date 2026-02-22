import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import webhooksReducer, {
  fetchWebhookEndpoints,
  createWebhookEndpoint,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
  regenerateWebhookSecret,
  testWebhookEndpoint,
  fetchApiKeys,
  createApiKey,
  revokeApiKey,
  deleteApiKey,
  clearWebhookError,
  clearTestResult,
  clearNewApiKey,
} from '../webhookSlice';
import api from '../../../services/api';
import type { WebhookState } from '../../../types/webhook';

// Mock the API
vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApi = api as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('webhookSlice', () => {
  let store: ReturnType<typeof configureStore>;

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

  beforeEach(() => {
    vi.clearAllMocks();
    store = configureStore({
      reducer: { webhooks: webhooksReducer },
    });
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const state = store.getState().webhooks;
      expect(state.endpoints).toEqual([]);
      expect(state.apiKeys).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('Synchronous Actions', () => {
    it('clearWebhookError clears the error', () => {
      store = configureStore({
        reducer: { webhooks: webhooksReducer },
        preloadedState: {
          webhooks: { ...initialState, error: 'Some error' },
        },
      });

      store.dispatch(clearWebhookError());
      expect(store.getState().webhooks.error).toBeNull();
    });

    it('clearTestResult clears test result', () => {
      store = configureStore({
        reducer: { webhooks: webhooksReducer },
        preloadedState: {
          webhooks: {
            ...initialState,
            testResult: { success: true, statusCode: 200 },
          },
        },
      });

      store.dispatch(clearTestResult());
      expect(store.getState().webhooks.testResult).toBeNull();
    });

    it('clearNewApiKey clears new API key', () => {
      store = configureStore({
        reducer: { webhooks: webhooksReducer },
        preloadedState: {
          webhooks: {
            ...initialState,
            newApiKey: {
              id: '123',
              name: 'Test',
              key: 'npm_test',
              keyPrefix: 'npm_test',
              scopes: ['read:contacts'],
              createdAt: '2024-01-01',
              updatedAt: '2024-01-01',
              status: 'active' as const,
            },
          },
        },
      });

      store.dispatch(clearNewApiKey());
      expect(store.getState().webhooks.newApiKey).toBeNull();
    });
  });

  describe('fetchWebhookEndpoints', () => {
    it('fetches endpoints successfully', async () => {
      const mockEndpoints = [
        {
          id: 'endpoint_1',
          url: 'HTTPS://example.com/webhook',
          events: ['contact.created'],
          isActive: true,
          secret: 'whsec_test',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];
      mockApi.get.mockResolvedValue({ data: mockEndpoints });

      await store.dispatch(fetchWebhookEndpoints());

      expect(mockApi.get).toHaveBeenCalledWith('/webhooks/endpoints');
      expect(store.getState().webhooks.endpoints).toEqual(mockEndpoints);
      expect(store.getState().webhooks.isLoading).toBe(false);
    });

    it('handles fetch error', async () => {
      mockApi.get.mockRejectedValue(new Error('Network error'));

      await store.dispatch(fetchWebhookEndpoints());

      expect(store.getState().webhooks.error).toBe('Network error');
      expect(store.getState().webhooks.isLoading).toBe(false);
    });
  });

  describe('createWebhookEndpoint', () => {
    it('creates endpoint successfully', async () => {
      const mockEndpoint = {
        id: 'endpoint_new',
        url: 'HTTPS://new.com/webhook',
        events: ['donation.created'],
        isActive: true,
        secret: 'whsec_new',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      mockApi.post.mockResolvedValue({ data: mockEndpoint });

      await store.dispatch(
        createWebhookEndpoint({
          url: 'HTTPS://new.com/webhook',
          events: ['donation.created'],
        })
      );

      expect(mockApi.post).toHaveBeenCalledWith('/webhooks/endpoints', {
        url: 'HTTPS://new.com/webhook',
        events: ['donation.created'],
      });
      expect(store.getState().webhooks.endpoints).toContainEqual(mockEndpoint);
    });
  });

  describe('updateWebhookEndpoint', () => {
    it('updates endpoint successfully', async () => {
      const existingEndpoint = {
        id: 'endpoint_1',
        url: 'HTTPS://example.com/webhook',
        events: ['contact.created'],
        isActive: true,
        secret: 'whsec_test',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      store = configureStore({
        reducer: { webhooks: webhooksReducer },
        preloadedState: {
          webhooks: { ...initialState, endpoints: [existingEndpoint] },
        },
      });

      const updatedEndpoint = { ...existingEndpoint, isActive: false };
      mockApi.put.mockResolvedValue({ data: updatedEndpoint });

      await store.dispatch(
        updateWebhookEndpoint({
          id: 'endpoint_1',
          data: { isActive: false },
        })
      );

      expect(store.getState().webhooks.endpoints[0].isActive).toBe(false);
    });
  });

  describe('deleteWebhookEndpoint', () => {
    it('deletes endpoint successfully', async () => {
      const existingEndpoint = {
        id: 'endpoint_1',
        url: 'HTTPS://example.com/webhook',
        events: ['contact.created'],
        isActive: true,
        secret: 'whsec_test',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      store = configureStore({
        reducer: { webhooks: webhooksReducer },
        preloadedState: {
          webhooks: { ...initialState, endpoints: [existingEndpoint] },
        },
      });

      mockApi.delete.mockResolvedValue({});

      await store.dispatch(deleteWebhookEndpoint('endpoint_1'));

      expect(store.getState().webhooks.endpoints).toHaveLength(0);
    });
  });

  describe('regenerateWebhookSecret', () => {
    it('regenerates secret successfully', async () => {
      const existingEndpoint = {
        id: 'endpoint_1',
        url: 'HTTPS://example.com/webhook',
        events: ['contact.created'],
        isActive: true,
        secret: 'whsec_old',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      store = configureStore({
        reducer: { webhooks: webhooksReducer },
        preloadedState: {
          webhooks: { ...initialState, endpoints: [existingEndpoint] },
        },
      });

      mockApi.post.mockResolvedValue({ data: { secret: 'whsec_new' } });

      await store.dispatch(regenerateWebhookSecret('endpoint_1'));

      expect(store.getState().webhooks.endpoints[0].secret).toBe('whsec_new');
    });
  });

  describe('testWebhookEndpoint', () => {
    it('tests endpoint successfully', async () => {
      const testResult = {
        success: true,
        statusCode: 200,
        responseTime: 150,
      };
      mockApi.post.mockResolvedValue({ data: testResult });

      await store.dispatch(testWebhookEndpoint('endpoint_1'));

      expect(store.getState().webhooks.testResult).toEqual(testResult);
      expect(store.getState().webhooks.isTesting).toBe(false);
    });

    it('handles test failure', async () => {
      mockApi.post.mockRejectedValue(new Error('Test failed'));

      await store.dispatch(testWebhookEndpoint('endpoint_1'));

      expect(store.getState().webhooks.testResult?.success).toBe(false);
      expect(store.getState().webhooks.testResult?.error).toBe('Test failed');
    });
  });

  describe('fetchApiKeys', () => {
    it('fetches API keys successfully', async () => {
      const mockApiKeys = [
        {
          id: 'key_1',
          name: 'Production',
          keyPrefix: 'npm_prod',
          scopes: ['read:contacts'],
          status: 'active',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];
      mockApi.get.mockResolvedValue({ data: mockApiKeys });

      await store.dispatch(fetchApiKeys());

      expect(mockApi.get).toHaveBeenCalledWith('/webhooks/api-keys');
      expect(store.getState().webhooks.apiKeys).toEqual(mockApiKeys);
    });
  });

  describe('createApiKey', () => {
    it('creates API key and stores the plain key', async () => {
      const mockResponse = {
        id: 'key_new',
        name: 'New Key',
        key: 'npm_fullkey123',
        keyPrefix: 'npm_fullke',
        scopes: ['read:contacts', 'write:contacts'],
        status: 'active',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      mockApi.post.mockResolvedValue({ data: mockResponse });

      await store.dispatch(
        createApiKey({
          name: 'New Key',
          scopes: ['read:contacts', 'write:contacts'],
        })
      );

      expect(store.getState().webhooks.newApiKey).toEqual(mockResponse);
      // The key should be added to the list without the plain key
      expect(store.getState().webhooks.apiKeys[0].id).toBe('key_new');
    });
  });

  describe('revokeApiKey', () => {
    it('revokes API key successfully', async () => {
      const existingKey = {
        id: 'key_1',
        name: 'Test',
        keyPrefix: 'npm_test',
        scopes: ['read:contacts' as const],
        status: 'active' as const,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      store = configureStore({
        reducer: { webhooks: webhooksReducer },
        preloadedState: {
          webhooks: { ...initialState, apiKeys: [existingKey] },
        },
      });

      mockApi.post.mockResolvedValue({});

      await store.dispatch(revokeApiKey('key_1'));

      expect(store.getState().webhooks.apiKeys[0].status).toBe('revoked');
    });
  });

  describe('deleteApiKey', () => {
    it('deletes API key successfully', async () => {
      const existingKey = {
        id: 'key_1',
        name: 'Test',
        keyPrefix: 'npm_test',
        scopes: ['read:contacts' as const],
        status: 'active' as const,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      store = configureStore({
        reducer: { webhooks: webhooksReducer },
        preloadedState: {
          webhooks: { ...initialState, apiKeys: [existingKey] },
        },
      });

      mockApi.delete.mockResolvedValue({});

      await store.dispatch(deleteApiKey('key_1'));

      expect(store.getState().webhooks.apiKeys).toHaveLength(0);
    });
  });
});
