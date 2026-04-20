import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetCampaignStats, mockGetCampaignEvents, mockGetTasks, mockGetPeople, mockGetOrganizations } =
  vi.hoisted(() => ({
  mockGetCampaignStats: vi.fn(),
  mockGetCampaignEvents: vi.fn(),
  mockGetTasks: vi.fn(),
  mockGetPeople: vi.fn(),
  mockGetOrganizations: vi.fn(),
}));

vi.mock('../campaign', () => ({
  getCampaignStats: mockGetCampaignStats,
  getCampaignEvents: mockGetCampaignEvents,
}));

vi.mock('../tasks', () => ({
  getTasks: mockGetTasks,
}));

vi.mock('../people', () => ({
  getPeople: mockGetPeople,
  updatePerson: vi.fn(),
  createPerson: vi.fn(),
}));

vi.mock('../organizations', () => ({
  getOrganizations: mockGetOrganizations,
}));

import LoopApiService from '../../LoopApiService';

describe('LoopApiService demo fallback', () => {
  beforeEach(() => {
    mockGetCampaignStats.mockReset();
    mockGetCampaignEvents.mockReset();
    mockGetTasks.mockReset();
    mockGetPeople.mockReset();
    mockGetOrganizations.mockReset();
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

  it('returns demo directory data on a demo route without calling the people API', async () => {
    window.history.pushState({}, '', '/demo/people');

    await expect(LoopApiService.getPeople({ role: 'staff' })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'demo-person-1', role: 'staff' }),
      ])
    );

    expect(mockGetPeople).not.toHaveBeenCalled();
  });

  it('returns demo organizations on a demo route without calling the linking API', async () => {
    window.history.pushState({}, '', '/demo/linking');

    await expect(LoopApiService.getOrganizations()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'demo-org-1', name: 'River City Mutual Aid' }),
      ])
    );

    expect(mockGetOrganizations).not.toHaveBeenCalled();
  });
});
