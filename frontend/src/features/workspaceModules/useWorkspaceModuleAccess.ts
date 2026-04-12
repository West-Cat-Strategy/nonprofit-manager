import { useEffect, useState } from 'react';
<<<<<<< HEAD
import {
  areWorkspaceModuleSettingsEqual,
  type WorkspaceModuleSettings,
} from './catalog';
=======
import type { WorkspaceModuleSettings } from './catalog';
>>>>>>> origin/main
import {
  getWorkspaceModuleAccessCachedSync,
  subscribeWorkspaceModuleAccess,
} from '../../services/workspaceModuleAccessService';

export const useWorkspaceModuleAccess = (): WorkspaceModuleSettings => {
  const [workspaceModules, setWorkspaceModules] = useState<WorkspaceModuleSettings>(() =>
    getWorkspaceModuleAccessCachedSync()
  );

  useEffect(() => {
<<<<<<< HEAD
    const nextWorkspaceModules = getWorkspaceModuleAccessCachedSync();
    setWorkspaceModules((current) =>
      areWorkspaceModuleSettingsEqual(current, nextWorkspaceModules)
        ? current
        : nextWorkspaceModules
    );
    return subscribeWorkspaceModuleAccess(() => {
      const next = getWorkspaceModuleAccessCachedSync();
      setWorkspaceModules((current) => (areWorkspaceModuleSettingsEqual(current, next) ? current : next));
=======
    setWorkspaceModules(getWorkspaceModuleAccessCachedSync());
    return subscribeWorkspaceModuleAccess(() => {
      setWorkspaceModules(getWorkspaceModuleAccessCachedSync());
>>>>>>> origin/main
    });
  }, []);

  return workspaceModules;
};

export default useWorkspaceModuleAccess;
