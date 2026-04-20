import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../../services/api';
import { MeetingsApiClient } from './meetingsApiClient';

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

describe('MeetingsApiClient', () => {
  const client = new MeetingsApiClient();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('unwraps keyed legacy list responses', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        committees: [{ id: 'committee-1', name: 'Finance' }],
      },
    } as never);
    mockedApi.get.mockResolvedValueOnce({
      data: {
        meetings: [{ id: 'meeting-1', title: 'Board Meeting' }],
      },
    } as never);

    await expect(client.listCommittees()).resolves.toEqual([{ id: 'committee-1', name: 'Finance' }]);
    await expect(client.listMeetings()).resolves.toEqual([{ id: 'meeting-1', title: 'Board Meeting' }]);
  });

  it('unwraps keyed legacy entity responses', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: {
        meeting: { id: 'meeting-1', title: 'Created Meeting' },
      },
    } as never);
    mockedApi.patch.mockResolvedValueOnce({
      data: {
        meeting: { id: 'meeting-1', title: 'Updated Meeting' },
      },
    } as never);

    await expect(client.createMeeting({ title: 'Created Meeting' })).resolves.toEqual({
      id: 'meeting-1',
      title: 'Created Meeting',
    });
    await expect(client.updateMeeting('meeting-1', { title: 'Updated Meeting' })).resolves.toEqual({
      id: 'meeting-1',
      title: 'Updated Meeting',
    });
  });
});
