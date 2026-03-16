import { decrypt } from '@utils/encryption';
import type {
  FacebookAccessSettings,
  SocialMediaServicePort,
  SocialMediaSnapshotRecord,
  SocialMediaSyncResult,
  SocialMediaSyncTarget,
  SocialMediaTrackedPageRecord,
} from '../types/contracts';
import type {
  SocialMediaDailySnapshot,
  SocialMediaOrgSettings,
  SocialMediaTrackedPage,
} from '@app-types/socialMedia';
import type {
  FacebookGraphClientPort,
  SocialMediaRepositoryPort,
  SocialMediaSettingsPatch,
} from '../types/contracts';

const FACEBOOK_PLATFORM = 'facebook' as const;
const DUE_SYNC_WINDOW_MS = 24 * 60 * 60 * 1000;

const toIso = (value: Date | null): string | null => (value ? value.toISOString() : null);

const toSnapshotDto = (snapshot: SocialMediaSnapshotRecord): SocialMediaDailySnapshot => ({
  id: snapshot.id,
  organizationId: snapshot.organizationId,
  pageId: snapshot.pageId,
  platform: snapshot.platform,
  snapshotDate: snapshot.snapshotDate.toISOString().slice(0, 10),
  followers: snapshot.followers,
  reach: snapshot.reach,
  impressions: snapshot.impressions,
  engagedUsers: snapshot.engagedUsers,
  postCount: snapshot.postCount,
  rawPayload: snapshot.rawPayload,
  createdAt: snapshot.createdAt.toISOString(),
  updatedAt: snapshot.updatedAt.toISOString(),
});

const toTrackedPageDto = (page: SocialMediaTrackedPageRecord): SocialMediaTrackedPage => ({
  id: page.id,
  organizationId: page.organizationId,
  platform: page.platform,
  externalPageId: page.externalPageId,
  pageName: page.pageName,
  syncEnabled: page.syncEnabled,
  lastSyncAt: toIso(page.lastSyncAt),
  lastSyncError: page.lastSyncError,
  linkedSiteIds: page.linkedSiteIds,
  latestSnapshot: page.latestSnapshot ? toSnapshotDto(page.latestSnapshot) : null,
  createdAt: page.createdAt.toISOString(),
  updatedAt: page.updatedAt.toISOString(),
});

export class SocialMediaUseCase implements SocialMediaServicePort {
  constructor(
    private readonly repository: SocialMediaRepositoryPort,
    private readonly facebookClient: FacebookGraphClientPort
  ) {}

  private toSettingsDto(settings: Awaited<ReturnType<SocialMediaRepositoryPort['getOrgSettings']>>): SocialMediaOrgSettings {
    if (!settings) {
      return {
        id: '',
        organizationId: '',
        platform: FACEBOOK_PLATFORM,
        appId: null,
        isConfigured: false,
        credentials: {
          accessToken: false,
          appSecret: false,
        },
        lastTestedAt: null,
        lastTestSuccess: null,
        lastSyncAt: null,
        lastSyncError: null,
        createdAt: '',
        updatedAt: '',
      };
    }

    return {
      id: settings.id,
      organizationId: settings.organizationId,
      platform: settings.platform,
      appId: settings.appId,
      isConfigured: settings.isConfigured,
      credentials: {
        accessToken: Boolean(settings.accessTokenEncrypted),
        appSecret: Boolean(settings.appSecretEncrypted),
      },
      lastTestedAt: toIso(settings.lastTestedAt),
      lastTestSuccess: settings.lastTestSuccess,
      lastSyncAt: toIso(settings.lastSyncAt),
      lastSyncError: settings.lastSyncError,
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    };
  }

  private buildFacebookAccessSettings(target: SocialMediaSyncTarget['settings']): FacebookAccessSettings {
    if (!target.accessTokenEncrypted) {
      throw new Error('Facebook settings not configured');
    }

    return {
      appId: target.appId,
      appSecret: target.appSecretEncrypted ? decrypt(target.appSecretEncrypted) : null,
      accessToken: decrypt(target.accessTokenEncrypted),
    };
  }

  private async getRequiredSettings(organizationId: string) {
    const settings = await this.repository.getOrgSettings(organizationId, FACEBOOK_PLATFORM);
    if (!settings?.accessTokenEncrypted) {
      throw new Error('Facebook settings not configured');
    }

    return settings;
  }

  private async syncTarget(
    target: SocialMediaSyncTarget,
    userId?: string | null
  ): Promise<SocialMediaTrackedPage> {
    const access = this.buildFacebookAccessSettings(target.settings);
    const pageAccessToken = target.page.pageAccessTokenEncrypted
      ? decrypt(target.page.pageAccessTokenEncrypted)
      : null;
    const syncTimestamp = new Date();

    try {
      const metrics = await this.facebookClient.fetchPageMetrics(target.page.externalPageId, {
        ...access,
        pageAccessToken,
      });

      await this.repository.upsertDailySnapshot({
        organizationId: target.page.organizationId,
        pageId: target.page.id,
        platform: FACEBOOK_PLATFORM,
        snapshotDate: syncTimestamp,
        followers: metrics.followers,
        reach: metrics.reach,
        impressions: metrics.impressions,
        engagedUsers: metrics.engagedUsers,
        postCount: metrics.postCount,
        rawPayload: metrics.rawPayload,
      });

      await this.repository.markPageSyncResult(target.page.id, syncTimestamp, null, userId);
      await this.repository.markOrgSettingsSyncResult(target.settings.id, syncTimestamp, null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Facebook sync failed';
      await this.repository.markPageSyncResult(target.page.id, syncTimestamp, message, userId);
      await this.repository.markOrgSettingsSyncResult(target.settings.id, syncTimestamp, message);
      throw error;
    }

    const updated = await this.repository.getTrackedPage(
      target.page.organizationId,
      target.page.id,
      FACEBOOK_PLATFORM
    );

    if (!updated) {
      throw new Error('Facebook page not found');
    }

    return toTrackedPageDto(updated);
  }

  async getFacebookSettings(organizationId: string): Promise<SocialMediaOrgSettings> {
    const settings = await this.repository.getOrgSettings(organizationId, FACEBOOK_PLATFORM);
    const dto = this.toSettingsDto(settings);
    if (!settings) {
      return {
        ...dto,
        organizationId,
      };
    }
    return dto;
  }

  async updateFacebookSettings(
    organizationId: string,
    patch: SocialMediaSettingsPatch,
    userId: string
  ): Promise<SocialMediaOrgSettings> {
    const settings = await this.repository.upsertOrgSettings(
      organizationId,
      FACEBOOK_PLATFORM,
      patch,
      userId
    );
    return this.toSettingsDto(settings);
  }

  async testFacebookSettings(organizationId: string): Promise<{
    success: boolean;
    accountName: string | null;
    pageCount: number;
    message: string;
  }> {
    const settings = await this.getRequiredSettings(organizationId);
    const access = this.buildFacebookAccessSettings(settings);

    try {
      const result = await this.facebookClient.validateAccess(access);
      await this.repository.markOrgSettingsTestResult(settings.id, true, null);
      return {
        success: true,
        accountName: result.accountName,
        pageCount: result.pageCount,
        message: `Facebook connection successful (${result.pageCount} page${result.pageCount === 1 ? '' : 's'} found)`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Facebook connection failed';
      await this.repository.markOrgSettingsTestResult(settings.id, false, message);
      return {
        success: false,
        accountName: null,
        pageCount: 0,
        message,
      };
    }
  }

  async discoverFacebookPages(
    organizationId: string,
    userId: string
  ): Promise<SocialMediaTrackedPage[]> {
    const settings = await this.getRequiredSettings(organizationId);
    const access = this.buildFacebookAccessSettings(settings);
    const pages = await this.facebookClient.listManagedPages(access);

    await this.repository.upsertTrackedPages(
      organizationId,
      settings.id,
      FACEBOOK_PLATFORM,
      pages,
      userId
    );

    return this.listFacebookPages(organizationId);
  }

  async listFacebookPages(organizationId: string): Promise<SocialMediaTrackedPage[]> {
    const pages = await this.repository.listTrackedPages(organizationId, FACEBOOK_PLATFORM);
    return pages.map((page) => toTrackedPageDto(page));
  }

  async getFacebookTrackedPageSummary(
    organizationId: string,
    pageId: string
  ): Promise<SocialMediaTrackedPage | null> {
    const page = await this.repository.getTrackedPage(organizationId, pageId, FACEBOOK_PLATFORM);
    return page ? toTrackedPageDto(page) : null;
  }

  async getFacebookPageSnapshots(
    organizationId: string,
    pageId: string,
    limit: number
  ): Promise<SocialMediaDailySnapshot[]> {
    const page = await this.repository.getTrackedPage(organizationId, pageId, FACEBOOK_PLATFORM);
    if (!page) {
      throw new Error('Facebook page not found');
    }

    const snapshots = await this.repository.listSnapshots(
      organizationId,
      pageId,
      FACEBOOK_PLATFORM,
      limit
    );

    return snapshots.map((snapshot) => toSnapshotDto(snapshot));
  }

  async syncFacebookPage(
    organizationId: string,
    pageId: string,
    userId?: string | null
  ): Promise<SocialMediaTrackedPage> {
    const target = await this.repository.getSyncTarget(organizationId, pageId, FACEBOOK_PLATFORM);
    if (!target) {
      throw new Error('Facebook page not found');
    }

    return this.syncTarget(target, userId);
  }

  async syncDueFacebookPages(limit: number): Promise<SocialMediaSyncResult> {
    const syncBefore = new Date(Date.now() - DUE_SYNC_WINDOW_MS);
    const targets = await this.repository.listDueSyncTargets(
      FACEBOOK_PLATFORM,
      syncBefore,
      limit
    );

    const errors: string[] = [];
    let synced = 0;

    for (const target of targets) {
      try {
        await this.syncTarget(target);
        synced += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Facebook sync error';
        errors.push(`${target.page.pageName}: ${message}`);
      }
    }

    return {
      processed: targets.length,
      synced,
      failed: errors.length,
      errors,
    };
  }
}
