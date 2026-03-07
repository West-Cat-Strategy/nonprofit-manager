import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchWebsiteOverview } from '../state';

export const useWebsiteOverviewLoader = (siteId?: string, period?: number) => {
  const dispatch = useAppDispatch();
  const overview = useAppSelector((state) => state.websites.overview);

  useEffect(() => {
    if (!siteId) return;
    if (overview?.site.id !== siteId) {
      void dispatch(fetchWebsiteOverview({ siteId, period }));
    }
  }, [dispatch, overview, period, siteId]);

  return overview?.site.id === siteId ? overview : null;
};

export default useWebsiteOverviewLoader;
