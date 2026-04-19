import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetCampaignStats, mockGetCampaignEvents, mockGetTasks } = vi.hoisted(() => ({
  mockGetCampaignStats: vi.fn(),
  mockGetCampaignEvents: vi.fn(),
  mockGetTasks: vi.fn(),
}));

vi.mock('../campaign', () => ({
  getCampaignStats: mockGetCampaignStats,
  getCampaignEvents: mockGetCampaignEvents,
}));

vi.mock('../tasks', () => ({
  getTasks: mockGetTasks,
}));

import LoopApiService from '../../LoopApiService';

describe('LoopApiService demo fallback', () => {
  beforeEach(() => {
    mockGetCampaignStats.mockReset();
    mockGetCampaignEvents.mockReset();
    mockGetTasks.mockReset();
  });

  it('returns demo outreach data on a demo route without calling the campaign APIs', async () => {
    window.history.pushState({}, '', '/demo/outreach');

    await expect(LoopApiService.getCampaignStats()).resolves.toMatchObject({
      peopleEngaged: 1234,
      newsletterSubs: '456',
      upcomingEvents: '7',
      activeDonors: '89',
      socialHandle: '@westcat',
    });
    await expect(LoopApiService.getCampaignEvents()).resolves.toHaveLength(2);

    expect(mockGetCampaignStats).not.toHaveBeenCalled();
    expect(mockGetCampaignEvents).not.toHaveBeenCalled();
  });

  it('returns demo operations data on a demo route without calling the task API', async () => {
    window.history.pushState({}, '', '/demo/operations');

    await expect(LoopApiService.getTasks()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'demo-task-1', title: 'Demo inbox triage' }),
      ])
    );

    expect(mockGetTasks).not.toHaveBeenCalled();
  });
});
