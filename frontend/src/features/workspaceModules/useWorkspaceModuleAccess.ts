import { useEffect, useState } from 'react';
import {
  areWorkspaceModuleSettingsEqual,
  type WorkspaceModuleSettings,
} from './catalog';
import {
  getWorkspaceModuleAccessCachedSync,
  subscribeWorkspaceModuleAccess,
} from '../../services/workspaceModuleAccessService';

export const useWorkspaceModuleAccess = (): WorkspaceModuleSettings => {
  const [workspaceModules, setWorkspaceModules] = useState<WorkspaceModuleSettings>(() =>
    getWorkspaceModuleAccessCachedSync()
  );

  useEffect(() => {
    const nextWorkspaceModules = getWorkspaceModuleAccessCachedSync();
    setWorkspaceModules((current) =>
      areWorkspaceModuleSettingsEqual(current, nextWorkspaceModules)
        ? current
        : nextWorkspaceModules
    );
    return subscribeWorkspaceModuleAccess(() => {
      const next = getWorkspaceModuleAccessCachedSync();
      setWorkspaceModules((current) => (areWorkspaceModuleSettingsEqual(current, next) ? current : next));
    });
  }, []);

  return workspaceModules;
};

export default useWorkspaceModuleAccess;
