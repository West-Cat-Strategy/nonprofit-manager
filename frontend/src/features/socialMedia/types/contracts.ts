import type { WebsiteSiteStatus } from '../../websites/types/contracts';

export type SocialMediaPlatform = 'facebook';

export interface SocialMediaCredentialFlags {
  accessToken: boolean;
  appSecret: boolean;
}

export interface SocialMediaOrgSettings {
  id: string;
  organizationId: string;
  platform: SocialMediaPlatform;
  appId: string | null;
  isConfigured: boolean;
  credentials: SocialMediaCredentialFlags;
  lastTestedAt: string | null;
  lastTestSuccess: boolean | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SocialMediaSettingsPatch {
  appId?: string | null;
  appSecret?: string | null;
  accessToken?: string | null;
}

export interface SocialMediaTestResult {
  success: boolean;
  accountName: string | null;
  pageCount: number;
  message: string;
}

export interface SocialMediaDailySnapshot {
  id: string;
  organizationId: string;
  pageId: string;
  platform: SocialMediaPlatform;
  snapshotDate: string;
  followers: number | null;
  reach: number | null;
  impressions: number | null;
  engagedUsers: number | null;
  postCount: number | null;
  rawPayload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SocialMediaTrackedPage {
  id: string;
  organizationId: string;
  platform: SocialMediaPlatform;
  externalPageId: string;
  pageName: string;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  linkedSiteIds: string[];
  latestSnapshot: SocialMediaDailySnapshot | null;
  createdAt: string;
  updatedAt: string;
}

export interface SocialMediaSiteMapping {
  siteId: string;
  siteName: string;
  primaryUrl: string;
  publishStatus: WebsiteSiteStatus;
  blocked: boolean;
  trackedPageId: string | null;
  trackedPageName: string | null;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  lastSyncError: string | null;
}

export interface SocialMediaState {
  settings: SocialMediaOrgSettings | null;
  pages: SocialMediaTrackedPage[];
  siteMappings: SocialMediaSiteMapping[];
  snapshotsByPageId: Record<string, SocialMediaDailySnapshot[]>;
  settingsLoading: boolean;
  pagesLoading: boolean;
  siteMappingsLoading: boolean;
  isSavingSettings: boolean;
  isTestingSettings: boolean;
  isDiscoveringPages: boolean;
  pageSyncingIds: Record<string, boolean>;
  siteSavingIds: Record<string, boolean>;
  snapshotLoadingByPageId: Record<string, boolean>;
  testResult: SocialMediaTestResult | null;
  error: string | null;
}
