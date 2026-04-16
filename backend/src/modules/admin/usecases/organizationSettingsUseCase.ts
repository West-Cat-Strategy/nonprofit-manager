import type {
  OrganizationSettings,
  OrganizationSettingsConfig,
} from '@app-types/organizationSettings';
import * as organizationSettingsRepository from '../repositories/organizationSettingsRepository';

export const getOrganizationSettings = async (
  organizationId: string,
  userIdForSeed?: string
): Promise<OrganizationSettings> =>
  organizationSettingsRepository.getOrganizationSettings(organizationId, userIdForSeed);

export const updateOrganizationSettings = async (
  organizationId: string,
  config: OrganizationSettingsConfig,
  userId: string | null
): Promise<OrganizationSettings> =>
  organizationSettingsRepository.upsertOrganizationSettings(organizationId, config, userId);
