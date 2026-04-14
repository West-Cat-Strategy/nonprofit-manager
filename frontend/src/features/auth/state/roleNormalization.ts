const ROLE_SLUG_ALIASES: Record<string, string> = {
  user: 'staff',
  readonly: 'viewer',
  member: 'viewer',
};

export const normalizeRoleSlug = (role?: string | null): string | null => {
  if (typeof role !== 'string') {
    return null;
  }

  const normalized = role.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return ROLE_SLUG_ALIASES[normalized] ?? normalized;
};

export const isAdminRole = (role?: string | null): boolean => normalizeRoleSlug(role) === 'admin';
