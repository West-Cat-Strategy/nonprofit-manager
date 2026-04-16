import type {
  OrganizationSettings,
  OrganizationSettingsConfig,
} from '@app-types/organizationSettings';
import {
  getOrganizationSettings as getStoredOrganizationSettings,
  upsertOrganizationSettings as upsertStoredOrganizationSettings,
} from '../lib/organizationSettingsStore';

export const getOrganizationSettings = async (
  organizationId: string,
  userIdForSeed?: string
): Promise<OrganizationSettings> =>
  getStoredOrganizationSettings(organizationId, userIdForSeed);

export const upsertOrganizationSettings = async (
  organizationId: string,
  config: OrganizationSettingsConfig,
  userId: string | null
): Promise<OrganizationSettings> =>
  upsertStoredOrganizationSettings(organizationId, config, userId);
