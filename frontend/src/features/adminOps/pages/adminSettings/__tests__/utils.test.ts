import { describe, expect, it } from 'vitest';
import { normalizeRoleSlug } from '../../../../auth/state/roleNormalization';
import { buildRoleLabelMap, getRoleDisplayLabel } from '../utils';

describe('admin settings role helpers', () => {
  it('normalizes role slugs with slugify and alias handling', () => {
    expect(normalizeRoleSlug(' User ')).toBe('staff');
    expect(normalizeRoleSlug('Read Only')).toBe('read-only');
    expect(normalizeRoleSlug('Member')).toBe('viewer');
  });

  it('uses normalized keys when building and reading role labels', () => {
    const roleLabels = buildRoleLabelMap([
      { value: 'User', label: 'Team Member', description: '', isSystem: false },
      { value: 'Member', label: 'Read Only User', description: '', isSystem: false },
    ]);

    expect(getRoleDisplayLabel('user', roleLabels)).toBe('Team Member');
    expect(getRoleDisplayLabel('readonly', roleLabels)).toBe('Read Only User');
    expect(getRoleDisplayLabel('Manager', roleLabels)).toBe('Manager');
  });
});
