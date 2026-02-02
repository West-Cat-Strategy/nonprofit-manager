/**
 * useSetupCheck Hook
 * Checks if first-time setup is required
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';

interface SetupStatus {
  setupRequired: boolean;
  userCount: number;
}

export const useSetupCheck = () => {
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const response = await api.get<SetupStatus>('/auth/setup-status');
        const { setupRequired } = response.data;

        setSetupRequired(setupRequired);

        // Redirect logic
        if (setupRequired && location.pathname !== '/setup') {
          // Setup is required, redirect to setup page
          navigate('/setup', { replace: true });
        } else if (!setupRequired && location.pathname === '/setup') {
          // Setup already completed, redirect to login
          navigate('/login', { replace: true });
        }
      } catch (error) {
        console.error('Error checking setup status:', error);
        // On error, assume setup is not required and let normal auth flow handle it
        setSetupRequired(false);
      } finally {
        setLoading(false);
      }
    };

    checkSetup();
  }, [navigate, location.pathname]);

  return { setupRequired, loading };
};
