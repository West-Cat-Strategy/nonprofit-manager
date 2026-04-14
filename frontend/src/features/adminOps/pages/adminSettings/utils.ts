import type { PermissionCatalogItem, Role, RoleSelectorItem } from './types';
import { normalizeRoleSlug } from '../../../auth/state/roleNormalization';

const normalizeDigits = (value: string): string => value.replace(/\D/g, '');

export const formatCanadianPhone = (phone: string): string => {
  const cleaned = normalizeDigits(phone);

  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  return phone;
};

export const formatCanadianPostalCode = (postalCode: string): string => {
  const cleaned = postalCode.replace(/\s/g, '').toUpperCase();

  if (cleaned.length === 6) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  }

  return postalCode;
};

export const validatePostalCode = (postalCode: string, country: string): boolean => {
  if (country === 'Canada') {
    const pattern = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
    return pattern.test(postalCode);
  }

  return true;
};

const humanizePhrase = (value: string): string =>
  value
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const LEGACY_ROLE_DISPLAY_LABELS: Record<string, string> = {
  user: 'Staff',
  readonly: 'Viewer',
  member: 'Viewer',
};

const DEFAULT_ROLE_DISPLAY_LABELS: Record<string, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  staff: 'Staff',
  volunteer: 'Volunteer',
  viewer: 'Viewer',
};

type RoleLike = Pick<Role, 'name' | 'label'> | RoleSelectorItem;

export const buildRoleLabelMap = (roles: RoleLike[]): Record<string, string> => {
  const labels: Record<string, string> = {};

  for (const role of roles) {
    const key = 'name' in role ? role.name : role.value;
    const normalizedKey = normalizeRoleSlug(key);
    if (normalizedKey) {
      labels[normalizedKey] = role.label;
    }
  }

  return labels;
};

export const getRoleDisplayLabel = (role: string, roleLabels: Record<string, string>): string => {
  const normalizedRole = normalizeRoleSlug(role);

  if (normalizedRole && roleLabels[normalizedRole]) {
    return roleLabels[normalizedRole];
  }

  if (roleLabels[role]) {
    return roleLabels[role];
  }

  if (normalizedRole && LEGACY_ROLE_DISPLAY_LABELS[normalizedRole]) {
    return LEGACY_ROLE_DISPLAY_LABELS[normalizedRole];
  }

  if (normalizedRole && DEFAULT_ROLE_DISPLAY_LABELS[normalizedRole]) {
    return DEFAULT_ROLE_DISPLAY_LABELS[normalizedRole];
  }

  return humanizePhrase(normalizedRole ?? role);
};

export const groupPermissionsByCategory = (permissions: PermissionCatalogItem[]) => {
  const grouped = permissions.reduce<Record<string, PermissionCatalogItem[]>>((acc, permission) => {
    const category = permission.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }

    acc[category].push(permission);
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([category, items]) => ({
      category,
      items: items.slice().sort((left, right) => left.label.localeCompare(right.label)),
    }));
};
