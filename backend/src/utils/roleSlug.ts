export const ROLE_SLUG_ALIASES: Record<string, string> = {
  user: 'staff',
  readonly: 'viewer',
  member: 'viewer',
};

export const slugifyRoleName = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

export const normalizeRoleSlug = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const slug = slugifyRoleName(value);
  if (!slug) {
    return null;
  }

  return ROLE_SLUG_ALIASES[slug] ?? slug;
};
