import {
  createDefaultWorkspaceModulesConfig,
  normalizeWorkspaceModulesConfig,
} from '@app-types/workspaceModules';

describe('workspace module config normalization', () => {
  it('defaults every module to enabled when config is missing', () => {
    expect(normalizeWorkspaceModulesConfig(undefined)).toEqual(
      createDefaultWorkspaceModulesConfig()
    );
  });

  it('fills missing module keys with enabled when a partial config is provided', () => {
    expect(
      normalizeWorkspaceModulesConfig({
        cases: false,
        donations: false,
      })
    ).toEqual({
      ...createDefaultWorkspaceModulesConfig(),
      cases: false,
      donations: false,
    });
  });
});
