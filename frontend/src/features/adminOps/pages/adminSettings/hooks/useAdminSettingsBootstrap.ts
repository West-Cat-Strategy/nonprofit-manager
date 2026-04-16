import { useEffect, useState } from 'react';

interface UseAdminSettingsBootstrapParams {
  loadOrganizationData: () => Promise<void>;
  loadRoles: () => Promise<void>;
}

export const useAdminSettingsBootstrap = ({
  loadOrganizationData,
  loadRoles,
}: UseAdminSettingsBootstrapParams) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await Promise.all([loadOrganizationData(), loadRoles()]);
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrap();
  }, [loadOrganizationData, loadRoles]);

  return {
    isLoading,
  };
};
