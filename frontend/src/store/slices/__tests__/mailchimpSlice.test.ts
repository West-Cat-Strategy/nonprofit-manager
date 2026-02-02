import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import mailchimpReducer, {
  fetchMailchimpStatus,
  fetchMailchimpLists,
  fetchMailchimpList,
  fetchListTags,
  fetchListSegments,
  fetchCampaigns,
  syncContact,
  bulkSyncContacts,
  clearMailchimpError,
  clearSyncResult,
  setSelectedList,
} from '../mailchimpSlice';
import api from '../../../services/api';
import type { MailchimpState, MailchimpList } from '../../../types/mailchimp';

// Mock the API
vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockApi = api as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };

describe('mailchimpSlice', () => {
  let store: ReturnType<typeof configureStore>;

  const initialState: MailchimpState = {
    status: null,
    lists: [],
    selectedList: null,
    tags: [],
    campaigns: [],
    segments: [],
    syncResult: null,
    isLoading: false,
    isSyncing: false,
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    store = configureStore({
      reducer: { mailchimp: mailchimpReducer },
    });
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const state = store.getState().mailchimp;
      expect(state.status).toBeNull();
      expect(state.lists).toEqual([]);
      expect(state.selectedList).toBeNull();
      expect(state.tags).toEqual([]);
      expect(state.campaigns).toEqual([]);
      expect(state.segments).toEqual([]);
      expect(state.syncResult).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isSyncing).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('Synchronous Actions', () => {
    it('clearMailchimpError clears the error state', () => {
      store = configureStore({
        reducer: { mailchimp: mailchimpReducer },
        preloadedState: {
          mailchimp: {
            ...initialState,
            error: 'Some error',
          },
        },
      });

      store.dispatch(clearMailchimpError());
      expect(store.getState().mailchimp.error).toBeNull();
    });

    it('clearSyncResult clears the sync result', () => {
      store = configureStore({
        reducer: { mailchimp: mailchimpReducer },
        preloadedState: {
          mailchimp: {
            ...initialState,
            syncResult: {
              total: 5,
              added: 3,
              updated: 2,
              skipped: 0,
              errors: 0,
              results: [],
            },
          },
        },
      });

      store.dispatch(clearSyncResult());
      expect(store.getState().mailchimp.syncResult).toBeNull();
    });

    it('setSelectedList sets the selected list', () => {
      const mockList: MailchimpList = {
        id: 'list_123',
        name: 'Test List',
        memberCount: 100,
        createdAt: '2024-01-01T00:00:00Z',
        doubleOptIn: true,
      };

      store.dispatch(setSelectedList(mockList));
      expect(store.getState().mailchimp.selectedList).toEqual(mockList);
    });

    it('setSelectedList can clear selected list', () => {
      const mockList: MailchimpList = {
        id: 'list_123',
        name: 'Test List',
        memberCount: 100,
        createdAt: '2024-01-01T00:00:00Z',
        doubleOptIn: true,
      };

      store = configureStore({
        reducer: { mailchimp: mailchimpReducer },
        preloadedState: {
          mailchimp: {
            ...initialState,
            selectedList: mockList,
          },
        },
      });

      store.dispatch(setSelectedList(null));
      expect(store.getState().mailchimp.selectedList).toBeNull();
    });
  });

  describe('fetchMailchimpStatus', () => {
    it('fetches status successfully', async () => {
      const mockStatus = {
        configured: true,
        accountName: 'Test Account',
        listCount: 5,
      };
      mockApi.get.mockResolvedValue({ data: mockStatus });

      await store.dispatch(fetchMailchimpStatus());

      expect(mockApi.get).toHaveBeenCalledWith('/mailchimp/status');
      expect(store.getState().mailchimp.status).toEqual(mockStatus);
      expect(store.getState().mailchimp.isLoading).toBe(false);
      expect(store.getState().mailchimp.error).toBeNull();
    });

    it('sets isLoading during status fetch', async () => {
      mockApi.get.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: { configured: true } }), 100)
          )
      );

      const promise = store.dispatch(fetchMailchimpStatus());
      expect(store.getState().mailchimp.isLoading).toBe(true);

      await promise;
      expect(store.getState().mailchimp.isLoading).toBe(false);
    });

    it('handles fetch status error', async () => {
      mockApi.get.mockRejectedValue(new Error('Network error'));

      await store.dispatch(fetchMailchimpStatus());

      expect(store.getState().mailchimp.status).toBeNull();
      expect(store.getState().mailchimp.error).toBe('Network error');
      expect(store.getState().mailchimp.isLoading).toBe(false);
    });
  });

  describe('fetchMailchimpLists', () => {
    it('fetches lists successfully', async () => {
      const mockLists: MailchimpList[] = [
        {
          id: 'list_1',
          name: 'Newsletter',
          memberCount: 500,
          createdAt: '2024-01-01T00:00:00Z',
          doubleOptIn: true,
        },
        {
          id: 'list_2',
          name: 'Donors',
          memberCount: 150,
          createdAt: '2024-02-01T00:00:00Z',
          doubleOptIn: false,
        },
      ];
      mockApi.get.mockResolvedValue({ data: mockLists });

      await store.dispatch(fetchMailchimpLists());

      expect(mockApi.get).toHaveBeenCalledWith('/mailchimp/lists');
      expect(store.getState().mailchimp.lists).toEqual(mockLists);
      expect(store.getState().mailchimp.isLoading).toBe(false);
    });

    it('handles fetch lists error', async () => {
      mockApi.get.mockRejectedValue(new Error('Failed to fetch lists'));

      await store.dispatch(fetchMailchimpLists());

      expect(store.getState().mailchimp.lists).toEqual([]);
      expect(store.getState().mailchimp.error).toBe('Failed to fetch lists');
    });
  });

  describe('fetchMailchimpList', () => {
    it('fetches single list successfully', async () => {
      const mockList: MailchimpList = {
        id: 'list_123',
        name: 'Donors',
        memberCount: 200,
        createdAt: '2024-01-01T00:00:00Z',
        doubleOptIn: true,
      };
      mockApi.get.mockResolvedValue({ data: mockList });

      await store.dispatch(fetchMailchimpList('list_123'));

      expect(mockApi.get).toHaveBeenCalledWith('/mailchimp/lists/list_123');
      expect(store.getState().mailchimp.selectedList).toEqual(mockList);
    });

    it('handles fetch list error', async () => {
      mockApi.get.mockRejectedValue(new Error('List not found'));

      await store.dispatch(fetchMailchimpList('invalid_list'));

      expect(store.getState().mailchimp.error).toBe('List not found');
    });
  });

  describe('fetchListTags', () => {
    it('fetches tags successfully', async () => {
      const mockTags = [
        { id: 1, name: 'VIP', memberCount: 50 },
        { id: 2, name: 'Active', memberCount: 100 },
      ];
      mockApi.get.mockResolvedValue({ data: mockTags });

      await store.dispatch(fetchListTags('list_123'));

      expect(mockApi.get).toHaveBeenCalledWith('/mailchimp/lists/list_123/tags');
      expect(store.getState().mailchimp.tags).toEqual(mockTags);
    });

    it('handles fetch tags error', async () => {
      mockApi.get.mockRejectedValue(new Error('Failed to fetch tags'));

      await store.dispatch(fetchListTags('list_123'));

      expect(store.getState().mailchimp.error).toBe('Failed to fetch tags');
    });
  });

  describe('fetchListSegments', () => {
    it('fetches segments successfully', async () => {
      const mockSegments = [
        {
          id: 1,
          name: 'Recent Donors',
          memberCount: 75,
          listId: 'list_123',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
        },
      ];
      mockApi.get.mockResolvedValue({ data: mockSegments });

      await store.dispatch(fetchListSegments('list_123'));

      expect(mockApi.get).toHaveBeenCalledWith('/mailchimp/lists/list_123/segments');
      expect(store.getState().mailchimp.segments).toEqual(mockSegments);
    });

    it('handles fetch segments error', async () => {
      mockApi.get.mockRejectedValue(new Error('Failed to fetch segments'));

      await store.dispatch(fetchListSegments('list_123'));

      expect(store.getState().mailchimp.error).toBe('Failed to fetch segments');
    });
  });

  describe('fetchCampaigns', () => {
    it('fetches all campaigns when no listId provided', async () => {
      const mockCampaigns = [
        {
          id: 'camp_1',
          type: 'regular' as const,
          status: 'sent' as const,
          title: 'Monthly Newsletter',
          subject: 'January Update',
          listId: 'list_123',
          createdAt: '2024-01-01T00:00:00Z',
          emailsSent: 500,
        },
      ];
      mockApi.get.mockResolvedValue({ data: mockCampaigns });

      await store.dispatch(fetchCampaigns(undefined));

      expect(mockApi.get).toHaveBeenCalledWith('/mailchimp/campaigns');
      expect(store.getState().mailchimp.campaigns).toEqual(mockCampaigns);
    });

    it('fetches campaigns for specific list', async () => {
      const mockCampaigns = [
        {
          id: 'camp_1',
          type: 'regular' as const,
          status: 'sent' as const,
          title: 'Donor Update',
          listId: 'list_123',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];
      mockApi.get.mockResolvedValue({ data: mockCampaigns });

      await store.dispatch(fetchCampaigns('list_123'));

      expect(mockApi.get).toHaveBeenCalledWith('/mailchimp/campaigns?listId=list_123');
      expect(store.getState().mailchimp.campaigns).toEqual(mockCampaigns);
    });

    it('handles fetch campaigns error', async () => {
      mockApi.get.mockRejectedValue(new Error('Failed to fetch campaigns'));

      await store.dispatch(fetchCampaigns(undefined));

      expect(store.getState().mailchimp.error).toBe('Failed to fetch campaigns');
    });
  });

  describe('syncContact', () => {
    it('syncs contact successfully (added)', async () => {
      const mockResult = {
        contactId: 'contact_123',
        email: 'test@example.com',
        success: true,
        action: 'added' as const,
      };
      mockApi.post.mockResolvedValue({ data: mockResult });

      const requestData = {
        contactId: 'contact_123',
        listId: 'list_123',
        tags: ['VIP'],
      };

      await store.dispatch(syncContact(requestData));

      expect(mockApi.post).toHaveBeenCalledWith('/mailchimp/sync/contact', requestData);
      expect(store.getState().mailchimp.syncResult).toEqual({
        total: 1,
        added: 1,
        updated: 0,
        skipped: 0,
        errors: 0,
        results: [mockResult],
      });
      expect(store.getState().mailchimp.isSyncing).toBe(false);
    });

    it('syncs contact successfully (updated)', async () => {
      const mockResult = {
        contactId: 'contact_123',
        email: 'test@example.com',
        success: true,
        action: 'updated' as const,
      };
      mockApi.post.mockResolvedValue({ data: mockResult });

      await store.dispatch(syncContact({ contactId: 'contact_123', listId: 'list_123' }));

      expect(store.getState().mailchimp.syncResult).toEqual({
        total: 1,
        added: 0,
        updated: 1,
        skipped: 0,
        errors: 0,
        results: [mockResult],
      });
    });

    it('syncs contact successfully (skipped)', async () => {
      const mockResult = {
        contactId: 'contact_123',
        email: 'test@example.com',
        success: true,
        action: 'skipped' as const,
      };
      mockApi.post.mockResolvedValue({ data: mockResult });

      await store.dispatch(syncContact({ contactId: 'contact_123', listId: 'list_123' }));

      expect(store.getState().mailchimp.syncResult).toEqual({
        total: 1,
        added: 0,
        updated: 0,
        skipped: 1,
        errors: 0,
        results: [mockResult],
      });
    });

    it('sets isSyncing during contact sync', async () => {
      mockApi.post.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: {
                    contactId: '123',
                    email: 'test@example.com',
                    success: true,
                    action: 'added',
                  },
                }),
              100
            )
          )
      );

      const promise = store.dispatch(syncContact({ contactId: '123', listId: 'list_123' }));
      expect(store.getState().mailchimp.isSyncing).toBe(true);

      await promise;
      expect(store.getState().mailchimp.isSyncing).toBe(false);
    });

    it('handles sync contact error', async () => {
      mockApi.post.mockRejectedValue(new Error('Sync failed'));

      await store.dispatch(syncContact({ contactId: '123', listId: 'list_123' }));

      expect(store.getState().mailchimp.error).toBe('Sync failed');
      expect(store.getState().mailchimp.isSyncing).toBe(false);
    });
  });

  describe('bulkSyncContacts', () => {
    it('bulk syncs contacts successfully', async () => {
      const mockResponse = {
        total: 3,
        added: 2,
        updated: 1,
        skipped: 0,
        errors: 0,
        results: [
          { contactId: '1', email: 'a@example.com', success: true, action: 'added' as const },
          { contactId: '2', email: 'b@example.com', success: true, action: 'added' as const },
          { contactId: '3', email: 'c@example.com', success: true, action: 'updated' as const },
        ],
      };
      mockApi.post.mockResolvedValue({ data: mockResponse });

      const requestData = {
        contactIds: ['1', '2', '3'],
        listId: 'list_123',
        tags: ['Synced'],
      };

      await store.dispatch(bulkSyncContacts(requestData));

      expect(mockApi.post).toHaveBeenCalledWith('/mailchimp/sync/bulk', requestData);
      expect(store.getState().mailchimp.syncResult).toEqual(mockResponse);
      expect(store.getState().mailchimp.isSyncing).toBe(false);
    });

    it('clears previous sync result on new bulk sync', async () => {
      store = configureStore({
        reducer: { mailchimp: mailchimpReducer },
        preloadedState: {
          mailchimp: {
            ...initialState,
            syncResult: {
              total: 1,
              added: 1,
              updated: 0,
              skipped: 0,
              errors: 0,
              results: [],
            },
          },
        },
      });

      mockApi.post.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: { total: 2, added: 2, updated: 0, skipped: 0, errors: 0, results: [] },
                }),
              100
            )
          )
      );

      const promise = store.dispatch(bulkSyncContacts({ contactIds: ['1', '2'], listId: 'list_123' }));

      // Sync result should be cleared when pending
      expect(store.getState().mailchimp.syncResult).toBeNull();

      await promise;
    });

    it('handles bulk sync error', async () => {
      mockApi.post.mockRejectedValue(new Error('Bulk sync failed'));

      await store.dispatch(bulkSyncContacts({ contactIds: ['1', '2'], listId: 'list_123' }));

      expect(store.getState().mailchimp.error).toBe('Bulk sync failed');
      expect(store.getState().mailchimp.isSyncing).toBe(false);
    });
  });

  describe('State Transitions', () => {
    it('handles full email marketing flow', async () => {
      // 1. Fetch status
      const mockStatus = { configured: true, accountName: 'Nonprofit', listCount: 2 };
      mockApi.get.mockResolvedValueOnce({ data: mockStatus });

      await store.dispatch(fetchMailchimpStatus());
      expect(store.getState().mailchimp.status).toEqual(mockStatus);

      // 2. Fetch lists
      const mockLists: MailchimpList[] = [
        { id: 'list_1', name: 'Newsletter', memberCount: 100, createdAt: '2024-01-01T00:00:00Z', doubleOptIn: true },
      ];
      mockApi.get.mockResolvedValueOnce({ data: mockLists });

      await store.dispatch(fetchMailchimpLists());
      expect(store.getState().mailchimp.lists).toEqual(mockLists);

      // 3. Select a list
      store.dispatch(setSelectedList(mockLists[0]));
      expect(store.getState().mailchimp.selectedList).toEqual(mockLists[0]);

      // 4. Fetch tags for list
      const mockTags = [{ id: 1, name: 'VIP' }];
      mockApi.get.mockResolvedValueOnce({ data: mockTags });

      await store.dispatch(fetchListTags('list_1'));
      expect(store.getState().mailchimp.tags).toEqual(mockTags);

      // 5. Bulk sync contacts
      const mockSyncResult = {
        total: 2,
        added: 2,
        updated: 0,
        skipped: 0,
        errors: 0,
        results: [],
      };
      mockApi.post.mockResolvedValueOnce({ data: mockSyncResult });

      await store.dispatch(bulkSyncContacts({ contactIds: ['1', '2'], listId: 'list_1' }));
      expect(store.getState().mailchimp.syncResult).toEqual(mockSyncResult);

      // 6. Clear sync result
      store.dispatch(clearSyncResult());
      expect(store.getState().mailchimp.syncResult).toBeNull();
    });

    it('handles error recovery flow', async () => {
      // 1. Get an error
      mockApi.get.mockRejectedValueOnce(new Error('Network error'));
      await store.dispatch(fetchMailchimpStatus());
      expect(store.getState().mailchimp.error).toBe('Network error');

      // 2. Clear the error
      store.dispatch(clearMailchimpError());
      expect(store.getState().mailchimp.error).toBeNull();

      // 3. Retry successfully
      mockApi.get.mockResolvedValueOnce({ data: { configured: true } });
      await store.dispatch(fetchMailchimpStatus());
      expect(store.getState().mailchimp.status).toEqual({ configured: true });
    });
  });
});
