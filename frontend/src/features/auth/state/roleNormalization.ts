const ROLE_SLUG_ALIASES: Record<string, string> = {
  user: 'staff',
  readonly: 'viewer',
  member: 'viewer',
};

const slugifyRoleSlug = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

export const normalizeRoleSlug = (role?: string | null): string | null => {
  if (typeof role !== 'string') {
    return null;
  }

  const normalized = slugifyRoleSlug(role);
  if (!normalized) {
    return null;
  }

  return ROLE_SLUG_ALIASES[normalized] ?? normalized;
};

export const isAdminRole = (role?: string | null): boolean => normalizeRoleSlug(role) === 'admin';
