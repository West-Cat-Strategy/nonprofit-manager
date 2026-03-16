import type {
  SocialMediaDailySnapshot,
  SocialMediaOrgSettings,
  SocialMediaPlatform,
  SocialMediaTrackedPage,
} from '@app-types/socialMedia';

export type { SocialMediaPlatform } from '@app-types/socialMedia';

export interface SocialMediaOrgSettingsRecord {
  id: string;
  organizationId: string;
  platform: SocialMediaPlatform;
  appId: string | null;
  appSecretEncrypted: string | null;
  accessTokenEncrypted: string | null;
  isConfigured: boolean;
  lastTestedAt: Date | null;
  lastTestSuccess: boolean | null;
  lastSyncAt: Date | null;
  lastSyncError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SocialMediaSnapshotRecord {
  id: string;
  organizationId: string;
  pageId: string;
  platform: SocialMediaPlatform;
  snapshotDate: Date;
  followers: number | null;
  reach: number | null;
  impressions: number | null;
  engagedUsers: number | null;
  postCount: number | null;
  rawPayload: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SocialMediaTrackedPageRecord {
  id: string;
  organizationId: string;
  settingsId: string;
  platform: SocialMediaPlatform;
  externalPageId: string;
  pageName: string;
  pageAccessTokenEncrypted: string | null;
  syncEnabled: boolean;
  lastSyncAt: Date | null;
  lastSyncError: string | null;
  linkedSiteIds: string[];
  latestSnapshot: SocialMediaSnapshotRecord | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SocialMediaSyncTarget {
  page: SocialMediaTrackedPageRecord;
  settings: SocialMediaOrgSettingsRecord;
}

export interface SocialMediaSettingsPatch {
  appId?: string | null;
  appSecret?: string | null;
  accessToken?: string | null;
}

export interface FacebookManagedPage {
  externalPageId: string;
  pageName: string;
  pageAccessToken: string | null;
}

export interface FacebookPageMetrics {
  followers: number | null;
  reach: number | null;
  impressions: number | null;
  engagedUsers: number | null;
  postCount: number | null;
  rawPayload: Record<string, unknown>;
}

export interface FacebookAccessSettings {
  appId: string | null;
  appSecret: string | null;
  accessToken: string;
}

export interface FacebookPageAccessSettings extends FacebookAccessSettings {
  pageAccessToken?: string | null;
}

export interface FacebookValidationResult {
  accountName: string | null;
  pageCount: number;
}

export interface FacebookGraphClientPort {
  validateAccess(settings: FacebookAccessSettings): Promise<FacebookValidationResult>;
  listManagedPages(settings: FacebookAccessSettings): Promise<FacebookManagedPage[]>;
  fetchPageMetrics(
    pageId: string,
    settings: FacebookPageAccessSettings
  ): Promise<FacebookPageMetrics>;
}

export interface SocialMediaRepositoryPort {
  getOrgSettings(
    organizationId: string,
    platform: SocialMediaPlatform
  ): Promise<SocialMediaOrgSettingsRecord | null>;
  upsertOrgSettings(
    organizationId: string,
    platform: SocialMediaPlatform,
    patch: SocialMediaSettingsPatch,
    userId: string
  ): Promise<SocialMediaOrgSettingsRecord>;
  markOrgSettingsTestResult(
    settingsId: string,
    success: boolean,
    errorMessage: string | null
  ): Promise<void>;
  markOrgSettingsSyncResult(
    settingsId: string,
    lastSyncAt: Date,
    errorMessage: string | null
  ): Promise<void>;
  upsertTrackedPages(
    organizationId: string,
    settingsId: string,
    platform: SocialMediaPlatform,
    pages: FacebookManagedPage[],
    userId: string
  ): Promise<void>;
  listTrackedPages(
    organizationId: string,
    platform: SocialMediaPlatform
  ): Promise<SocialMediaTrackedPageRecord[]>;
  getTrackedPage(
    organizationId: string,
    pageId: string,
    platform: SocialMediaPlatform
  ): Promise<SocialMediaTrackedPageRecord | null>;
  getSyncTarget(
    organizationId: string,
    pageId: string,
    platform: SocialMediaPlatform
  ): Promise<SocialMediaSyncTarget | null>;
  listDueSyncTargets(
    platform: SocialMediaPlatform,
    syncBefore: Date,
    limit: number
  ): Promise<SocialMediaSyncTarget[]>;
  markPageSyncResult(
    pageId: string,
    lastSyncAt: Date,
    errorMessage: string | null,
    userId?: string | null
  ): Promise<void>;
  upsertDailySnapshot(args: {
    organizationId: string;
    pageId: string;
    platform: SocialMediaPlatform;
    snapshotDate: Date;
    followers: number | null;
    reach: number | null;
    impressions: number | null;
    engagedUsers: number | null;
    postCount: number | null;
    rawPayload: Record<string, unknown>;
  }): Promise<SocialMediaSnapshotRecord>;
  listSnapshots(
    organizationId: string,
    pageId: string,
    platform: SocialMediaPlatform,
    limit: number
  ): Promise<SocialMediaSnapshotRecord[]>;
}

export interface SocialMediaSyncResult {
  processed: number;
  synced: number;
  failed: number;
  errors: string[];
}

export interface SocialMediaServicePort {
  getFacebookSettings(organizationId: string): Promise<SocialMediaOrgSettings>;
  updateFacebookSettings(
    organizationId: string,
    patch: SocialMediaSettingsPatch,
    userId: string
  ): Promise<SocialMediaOrgSettings>;
  testFacebookSettings(organizationId: string): Promise<{
    success: boolean;
    accountName: string | null;
    pageCount: number;
    message: string;
  }>;
  discoverFacebookPages(organizationId: string, userId: string): Promise<SocialMediaTrackedPage[]>;
  listFacebookPages(organizationId: string): Promise<SocialMediaTrackedPage[]>;
  getFacebookTrackedPageSummary(
    organizationId: string,
    pageId: string
  ): Promise<SocialMediaTrackedPage | null>;
  getFacebookPageSnapshots(
    organizationId: string,
    pageId: string,
    limit: number
  ): Promise<SocialMediaDailySnapshot[]>;
  syncFacebookPage(
    organizationId: string,
    pageId: string,
    userId?: string | null
  ): Promise<SocialMediaTrackedPage>;
  syncDueFacebookPages(limit: number): Promise<SocialMediaSyncResult>;
}
