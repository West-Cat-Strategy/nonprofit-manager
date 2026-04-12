<<<<<<< HEAD
import type { PermissionCatalogItem, Role, RoleSelectorItem } from '../types';

const normalizeDigits = (value: string): string => value.replace(/\D/g, '');

export const formatCanadianPhone = (phone: string): string => {
  const cleaned = normalizeDigits(phone);

  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

=======
export const formatCanadianPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
>>>>>>> origin/main
  return phone;
};

export const formatCanadianPostalCode = (postalCode: string): string => {
  const cleaned = postalCode.replace(/\s/g, '').toUpperCase();
<<<<<<< HEAD

  if (cleaned.length === 6) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  }

=======
  if (cleaned.length === 6) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  }
>>>>>>> origin/main
  return postalCode;
};

export const validatePostalCode = (postalCode: string, country: string): boolean => {
  if (country === 'Canada') {
    const pattern = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
    return pattern.test(postalCode);
  }
<<<<<<< HEAD

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
    if (key) {
      labels[key] = role.label;
    }
  }

  return labels;
};

export const getRoleDisplayLabel = (role: string, roleLabels: Record<string, string>): string =>
  roleLabels[role] ||
  LEGACY_ROLE_DISPLAY_LABELS[role] ||
  DEFAULT_ROLE_DISPLAY_LABELS[role] ||
  humanizePhrase(role);

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
=======
  return true;
};
>>>>>>> origin/main
