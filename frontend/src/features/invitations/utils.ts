import { normalizeRoleSlug } from '../auth/state/roleNormalization';

const LEGACY_ROLE_DISPLAY_LABELS: Record<string, string> = {
  member: 'Viewer',
  readonly: 'Viewer',
  user: 'Staff',
};

const DEFAULT_ROLE_DISPLAY_LABELS: Record<string, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  staff: 'Staff',
  viewer: 'Viewer',
  volunteer: 'Volunteer',
};

const humanizePhrase = (value: string): string =>
  value
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const getInvitationRoleDisplayLabel = (
  role: string,
  roleLabels: Record<string, string>
): string => {
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
