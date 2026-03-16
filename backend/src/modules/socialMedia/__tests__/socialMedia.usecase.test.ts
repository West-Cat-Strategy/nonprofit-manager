import { encrypt } from '@utils/encryption';
import { SocialMediaUseCase } from '../usecases/socialMedia.usecase';
import type {
  FacebookGraphClientPort,
  SocialMediaOrgSettingsRecord,
  SocialMediaRepositoryPort,
  SocialMediaSnapshotRecord,
  SocialMediaSyncTarget,
  SocialMediaTrackedPageRecord,
} from '../types/contracts';

const createRepositoryMock = (): jest.Mocked<SocialMediaRepositoryPort> => ({
  getOrgSettings: jest.fn(),
  upsertOrgSettings: jest.fn(),
  markOrgSettingsTestResult: jest.fn(),
  markOrgSettingsSyncResult: jest.fn(),
  upsertTrackedPages: jest.fn(),
  listTrackedPages: jest.fn(),
  getTrackedPage: jest.fn(),
  getSyncTarget: jest.fn(),
  listDueSyncTargets: jest.fn(),
  markPageSyncResult: jest.fn(),
  upsertDailySnapshot: jest.fn(),
  listSnapshots: jest.fn(),
});

const createFacebookClientMock = (): jest.Mocked<FacebookGraphClientPort> => ({
  validateAccess: jest.fn(),
  listManagedPages: jest.fn(),
  fetchPageMetrics: jest.fn(),
});

const buildSettings = (): SocialMediaOrgSettingsRecord => ({
  id: 'settings-1',
  organizationId: 'org-1',
  platform: 'facebook',
  appId: 'fb-app',
  appSecretEncrypted: encrypt('app-secret'),
  accessTokenEncrypted: encrypt('user-token'),
  isConfigured: true,
  lastTestedAt: null,
  lastTestSuccess: null,
  lastSyncAt: null,
  lastSyncError: null,
  createdAt: new Date('2026-03-15T00:00:00.000Z'),
  updatedAt: new Date('2026-03-15T00:00:00.000Z'),
});

const buildPage = (): SocialMediaTrackedPageRecord => ({
  id: 'page-1',
  organizationId: 'org-1',
  settingsId: 'settings-1',
  platform: 'facebook',
  externalPageId: 'fb-page-1',
  pageName: 'River District Volunteers',
  pageAccessTokenEncrypted: encrypt('page-token'),
  syncEnabled: true,
  lastSyncAt: null,
  lastSyncError: null,
  linkedSiteIds: [],
  latestSnapshot: null,
  createdAt: new Date('2026-03-15T00:00:00.000Z'),
  updatedAt: new Date('2026-03-15T00:00:00.000Z'),
});

const buildSnapshot = (): SocialMediaSnapshotRecord => ({
  id: 'snapshot-1',
  organizationId: 'org-1',
  pageId: 'page-1',
  platform: 'facebook',
  snapshotDate: new Date('2026-03-15T00:00:00.000Z'),
  followers: 300,
  reach: 800,
  impressions: 1200,
  engagedUsers: 72,
  postCount: 9,
  rawPayload: { source: 'facebook' },
  createdAt: new Date('2026-03-15T00:00:00.000Z'),
  updatedAt: new Date('2026-03-15T00:00:00.000Z'),
});

describe('SocialMediaUseCase', () => {
  let repository: jest.Mocked<SocialMediaRepositoryPort>;
  let facebookClient: jest.Mocked<FacebookGraphClientPort>;
  let useCase: SocialMediaUseCase;

  beforeEach(() => {
    repository = createRepositoryMock();
    facebookClient = createFacebookClientMock();
    useCase = new SocialMediaUseCase(repository, facebookClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('syncs due Facebook pages using a 24-hour cutoff and aggregates failures', async () => {
    const now = new Date('2026-03-15T12:00:00.000Z');
    jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

    const settings = buildSettings();
    const pageOne = buildPage();
    const pageTwo = {
      ...buildPage(),
      id: 'page-2',
      pageName: 'Downtown Campaign',
      externalPageId: 'fb-page-2',
    };

    const targets: SocialMediaSyncTarget[] = [
      { settings, page: pageOne },
      { settings, page: pageTwo },
    ];

    repository.listDueSyncTargets.mockResolvedValue(targets);
    facebookClient.fetchPageMetrics
      .mockResolvedValueOnce({
        followers: 300,
        reach: 800,
        impressions: 1200,
        engagedUsers: 72,
        postCount: 9,
        rawPayload: { ok: true },
      })
      .mockRejectedValueOnce(new Error('Facebook is rate limiting this page'));
    repository.upsertDailySnapshot.mockResolvedValue(buildSnapshot());
    repository.markPageSyncResult.mockResolvedValue();
    repository.markOrgSettingsSyncResult.mockResolvedValue();
    repository.getTrackedPage.mockResolvedValueOnce({
      ...pageOne,
      lastSyncAt: now,
      latestSnapshot: buildSnapshot(),
    });

    const result = await useCase.syncDueFacebookPages(5);

    expect(repository.listDueSyncTargets).toHaveBeenCalledWith(
      'facebook',
      new Date('2026-03-14T12:00:00.000Z'),
      5
    );
    expect(result).toEqual({
      processed: 2,
      synced: 1,
      failed: 1,
      errors: ['Downtown Campaign: Facebook is rate limiting this page'],
    });
  });

  it('rejects snapshot reads when the tracked page does not exist', async () => {
    repository.getTrackedPage.mockResolvedValue(null);

    await expect(
      useCase.getFacebookPageSnapshots('org-1', 'missing-page', 30)
    ).rejects.toThrow('Facebook page not found');
  });
});
