import { useEffect, useState } from 'react';
import type { WorkspaceModuleSettings } from './catalog';
import {
  getWorkspaceModuleAccessCachedSync,
  subscribeWorkspaceModuleAccess,
} from '../../services/workspaceModuleAccessService';

export const useWorkspaceModuleAccess = (): WorkspaceModuleSettings => {
  const [workspaceModules, setWorkspaceModules] = useState<WorkspaceModuleSettings>(() =>
    getWorkspaceModuleAccessCachedSync()
  );

  useEffect(() => {
    setWorkspaceModules(getWorkspaceModuleAccessCachedSync());
    return subscribeWorkspaceModuleAccess(() => {
      setWorkspaceModules(getWorkspaceModuleAccessCachedSync());
    });
  }, []);

  return workspaceModules;
};

export default useWorkspaceModuleAccess;
