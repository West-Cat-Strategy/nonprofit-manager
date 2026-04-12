import { logger } from '@config/logger';
import { normalizeRoleSlug } from '@utils/roleSlug';
import * as registrationRepo from '../repositories/registrationSettingsRepository';

export type RegistrationMode = registrationRepo.RegistrationMode;

export interface RegistrationSettings {
  id: string;
  registrationMode: RegistrationMode;
  defaultRole: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateRegistrationSettingsDTO {
  registrationMode?: RegistrationMode;
  defaultRole?: string;
}

const REGISTRATION_MODE_CACHE_TTL_MS = 30_000;

type RegistrationModeCacheEntry = {
  mode: RegistrationMode;
  expiresAt: number;
};

let registrationModeCache: RegistrationModeCacheEntry | null = null;

function toModel(row: registrationRepo.SettingsRow): RegistrationSettings {
  return {
    id: row.id,
    registrationMode: row.registration_mode,
    defaultRole: normalizeRoleSlug(row.default_role) ?? row.default_role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function readRegistrationModeCache(): RegistrationMode | null {
  if (!registrationModeCache) {
    return null;
  }

  if (Date.now() >= registrationModeCache.expiresAt) {
    registrationModeCache = null;
    return null;
  }

  return registrationModeCache.mode;
}

function setRegistrationModeCache(mode: RegistrationMode): void {
  registrationModeCache = {
    mode,
    expiresAt: Date.now() + REGISTRATION_MODE_CACHE_TTL_MS,
  };
}

function clearRegistrationModeCache(): void {
  registrationModeCache = null;
}

/**
 * Get the current registration settings (creates a default row if none exists).
 */
export async function getRegistrationSettings(): Promise<RegistrationSettings> {
  const existingRow = await registrationRepo.getRegistrationSettingsRow();
  if (existingRow) {
    return toModel(existingRow);
  }

  const newRow = await registrationRepo.insertDefaultRegistrationSettingsRow();
  return toModel(newRow);
}

/**
 * Update registration settings.
 */
export async function updateRegistrationSettings(
  dto: UpdateRegistrationSettingsDTO,
  modifiedBy?: string
): Promise<RegistrationSettings> {
  const current = await getRegistrationSettings();

  const mode = dto.registrationMode ?? current.registrationMode;
  const role = normalizeRoleSlug(dto.defaultRole ?? current.defaultRole) ?? current.defaultRole;

  const updatedRow = await registrationRepo.updateRegistrationSettingsRow(
    mode,
    role,
    modifiedBy ?? null,
    current.id
  );

  logger.info(`Registration settings updated: mode=${mode}, defaultRole=${role}`);
  clearRegistrationModeCache();
  return toModel(updatedRow);
}

/**
 * Quick helper used by the register endpoint and the public status endpoint.
 * Returns just the mode string for fast checks.
 */
export async function getRegistrationMode(): Promise<RegistrationMode> {
  const cachedMode = readRegistrationModeCache();
  if (cachedMode) {
    return cachedMode;
  }

  const settings = await getRegistrationSettings();
  setRegistrationModeCache(settings.registrationMode);
  return settings.registrationMode;
}

export function __resetRegistrationModeCacheForTests(): void {
  clearRegistrationModeCache();
}
