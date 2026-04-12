import type { Pool, PoolClient } from 'pg';
import pool from '@config/database';
import { RoleCatalogError } from '../errors/roleCatalogErrors';
import { normalizeRoleSlug, ROLE_SLUG_ALIASES } from '@utils/roleSlug';
import * as roleRepository from '../repositories/roleCatalogRepository';

export const CANONICAL_ROLE_SLUGS = ['admin', 'manager', 'staff', 'volunteer', 'viewer'] as const;
export type CanonicalRoleSlug = (typeof CANONICAL_ROLE_SLUGS)[number];

export const ROLE_SELECTOR_ALIASES =
  ROLE_SLUG_ALIASES as Record<string, CanonicalRoleSlug>;

const CANONICAL_ROLE_SET = new Set<string>(CANONICAL_ROLE_SLUGS);

const DEFAULT_ROLE_LABELS: Record<CanonicalRoleSlug, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  staff: 'Staff',
  volunteer: 'Volunteer',
  viewer: 'Viewer',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Create',
  read: 'View',
  update: 'Edit',
  delete: 'Delete',
  export: 'Export',
  manage: 'Manage',
  manage_registrations: 'Manage registrations',
  admin: 'Administer',
};

export interface RoleCatalogItem {
  id: string;
  name: string;
  label: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
  priority: number;
}

export interface RoleSelectorItem {
  value: string;
  label: string;
  description: string;
  isSystem: boolean;
}

export interface PermissionCatalogItem {
  id: string;
  name: string;
  label: string;
  description: string;
  resource: string;
  action: string;
  category: string;
}

export interface CreateRoleInput {
  name: string;
  description?: string | null;
  permissions?: string[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string | null;
  permissions?: string[];
}

const humanizePhrase = (value: string): string =>
  value
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export { normalizeRoleSlug } from '@utils/roleSlug';

function getCanonicalRoleName(value: string): string {
  return normalizeRoleSlug(value) ?? value;
}

export const isSystemRoleSlug = (value: string | null | undefined): boolean => {
  const normalized = normalizeRoleSlug(value);
  return normalized ? CANONICAL_ROLE_SET.has(normalized) : false;
};

export const humanizeRoleLabel = (value: string): string => {
  const normalized = normalizeRoleSlug(value);
  if (normalized && DEFAULT_ROLE_LABELS[normalized as CanonicalRoleSlug]) {
    return DEFAULT_ROLE_LABELS[normalized as CanonicalRoleSlug];
  }

  return humanizePhrase(value);
};

const humanizePermissionLabel = (resource: string, action: string): string => {
  const resourceLabel = humanizePhrase(resource);
  const actionLabel = ACTION_LABELS[action] ?? humanizePhrase(action);
  return `${actionLabel} ${resourceLabel}`.trim();
};

const mapRoleRow = (row: roleRepository.RoleRow): RoleCatalogItem => ({
  id: row.id,
  name: getCanonicalRoleName(row.name),
  label: humanizeRoleLabel(row.name),
  description: row.description || '',
  permissions: Array.isArray(row.permissions) ? row.permissions.filter(Boolean) : [],
  isSystem: Boolean(row.is_system) || CANONICAL_ROLE_SET.has(getCanonicalRoleName(row.name)),
  userCount: Number.parseInt(String(row.user_count ?? 0), 10) || 0,
  priority: Number.parseInt(String(row.priority ?? 0), 10) || 0,
});

const ensurePermissionsExist = async (
  db: Pool | PoolClient,
  permissionNames: string[]
): Promise<void> => {
  const resolved = await roleRepository.loadPermissionIds(db, permissionNames);
  const resolvedNames = new Set(resolved.map((permission) => permission.name));
  const missing = permissionNames.filter((permission) => !resolvedNames.has(permission));

  if (missing.length > 0) {
    throw new RoleCatalogError('UNKNOWN_PERMISSION', `Unknown permissions: ${missing.join(', ')}`);
  }
};

export const getRoleCatalog = async (): Promise<RoleCatalogItem[]> => {
  if (!(await roleRepository.hasRoleTables())) {
    return [];
  }
  const rows = await roleRepository.getRoleCatalogRows();
  return rows.map(mapRoleRow);
};

export const getRoleSelectorItems = async (): Promise<RoleSelectorItem[]> => {
  const roles = await getRoleCatalog();
  return roles.map((role) => ({
    value: role.name,
    label: role.label,
    description: role.description,
    isSystem: role.isSystem,
  }));
};

export const getPermissionCatalog = async (): Promise<PermissionCatalogItem[]> => {
  if (!(await roleRepository.hasPermissionTable())) {
    return [];
  }
  const rows = await roleRepository.getPermissionCatalogRows();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    label: humanizePermissionLabel(row.resource, row.action),
    description: row.description || '',
    resource: row.resource,
    action: row.action,
    category: humanizePhrase(row.resource),
  }));
};

export const createRole = async (input: CreateRoleInput): Promise<RoleCatalogItem> => {
  const normalizedName = normalizeRoleSlug(input.name);
  if (!normalizedName) {
    throw new RoleCatalogError('INVALID_INPUT', 'Role name is required');
  }

  if (CANONICAL_ROLE_SET.has(normalizedName)) {
    throw new RoleCatalogError('RESERVED', 'System role slugs are reserved');
  }

  const description = input.description?.trim() || null;
  const permissionNames = Array.from(new Set((input.permissions || []).map((permission) => permission.trim()).filter(Boolean)));

  await roleRepository.withTransaction(async (db) => {
    const existing = await roleRepository.findRoleRowByNormalizedName(db, normalizedName);
    if (existing) {
      throw new RoleCatalogError('CONFLICT', 'A role with this slug already exists');
    }

    await ensurePermissionsExist(db, permissionNames);
    const roleId = await roleRepository.insertRole(db, normalizedName, description);

    if (permissionNames.length > 0) {
      const resolvedPermissions = await roleRepository.loadPermissionIds(db, permissionNames);
      await roleRepository.insertRolePermissions(
        db,
        roleId,
        resolvedPermissions.map((p) => p.id)
      );
    }
  });

  const role = (await getRoleCatalog()).find((candidate) => candidate.name === normalizedName);
  if (!role) {
    throw new Error('Failed to reload created role');
  }
  return role;
};

export const updateRole = async (
  roleId: string,
  input: UpdateRoleInput
): Promise<RoleCatalogItem> => {
  const normalizedName = input.name ? normalizeRoleSlug(input.name) : null;
  const description = input.description === undefined ? undefined : input.description?.trim() || null;
  const permissionNames = input.permissions
    ? Array.from(new Set(input.permissions.map((permission) => permission.trim()).filter(Boolean)))
    : null;

  await roleRepository.withTransaction(async (db) => {
    const existing = await roleRepository.getBaseRoleById(db, roleId);
    if (!existing) {
      throw new RoleCatalogError('NOT_FOUND', 'Role not found');
    }

    const currentName = getCanonicalRoleName(existing.name);
    const currentIsSystem = Boolean(existing.is_system) || CANONICAL_ROLE_SET.has(currentName as CanonicalRoleSlug);

    if (currentIsSystem && normalizedName && normalizedName !== currentName) {
      throw new RoleCatalogError('RESERVED', 'System role slugs cannot be renamed');
    }

    if (normalizedName && normalizedName !== currentName) {
      if (CANONICAL_ROLE_SET.has(normalizedName)) {
        throw new RoleCatalogError('RESERVED', 'System role slugs are reserved');
      }

      const conflict = await roleRepository.findRoleRowByNormalizedName(db, normalizedName, roleId);
      if (conflict) {
        throw new RoleCatalogError('CONFLICT', 'A role with this slug already exists');
      }

      await roleRepository.cascadeRoleRename(db, roleId, existing.name, normalizedName);
    }

    if (description !== undefined) {
      await roleRepository.updateRoleDescription(db, roleId, description);
    }

    if (permissionNames) {
      await ensurePermissionsExist(db, permissionNames);
      await roleRepository.deleteRolePermissions(db, roleId);
      if (permissionNames.length > 0) {
        const resolvedPermissions = await roleRepository.loadPermissionIds(db, permissionNames);
        await roleRepository.insertRolePermissions(
          db,
          roleId,
          resolvedPermissions.map((p) => p.id)
        );
      }
    }
  });

  const updated = (await getRoleCatalog()).find((role) => role.id === roleId);
  if (!updated) {
    throw new Error('Failed to reload updated role');
  }
  return updated;
};

export const deleteRole = async (roleId: string): Promise<void> => {
  await roleRepository.withTransaction(async (db) => {
    const existing = await roleRepository.getBaseRoleById(db, roleId);
    if (!existing) {
      throw new RoleCatalogError('NOT_FOUND', 'Role not found');
    }

    const currentName = getCanonicalRoleName(existing.name);
    if (existing.is_system || CANONICAL_ROLE_SET.has(currentName as CanonicalRoleSlug)) {
      throw new RoleCatalogError('RESERVED', 'System roles cannot be deleted');
    }

    const counts = await roleRepository.getRoleUsageCounts(db, existing.name);
    const totalReferences = counts.userCount + counts.invitationCount + counts.registrationCount;

    if (totalReferences > 0) {
      throw new RoleCatalogError('IN_USE', 'Role is still assigned to users or invitations');
    }

    await roleRepository.deleteRoleRow(db, roleId);
  });
};

export const getRoleNameById = async (roleId: string): Promise<string | null> => {
  const row = await roleRepository.getRoleNameRowById(roleId);
  return row?.name ? getCanonicalRoleName(row.name) : null;
};

export const getRoleByName = async (
  name: string,
  db: Pool | PoolClient = pool
): Promise<RoleCatalogItem | null> => {
  const normalizedName = normalizeRoleSlug(name);
  if (!normalizedName) {
    return null;
  }

  if (!(await roleRepository.hasRoleTables(db))) {
    return null;
  }

  const row = await roleRepository.findRoleRowByNormalizedName(db, normalizedName);
  if (!row) {
    return null;
  }

  const roleRow = await roleRepository.getRoleRowById(row.id, db);
  return roleRow ? mapRoleRow(roleRow) : null;
};
