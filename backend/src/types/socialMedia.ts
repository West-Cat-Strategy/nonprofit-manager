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

export interface WebsiteFacebookIntegrationSettings {
  trackedPageId?: string | null;
  syncEnabled?: boolean;
}

export interface WebsiteSocialSettings {
  facebook: WebsiteFacebookIntegrationSettings;
}

export interface WebsiteFacebookIntegrationStatus extends WebsiteFacebookIntegrationSettings {
  trackedPageName?: string | null;
  lastSyncAt: string | null;
  lastSyncError?: string | null;
}
