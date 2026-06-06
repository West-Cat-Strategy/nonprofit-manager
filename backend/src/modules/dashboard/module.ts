import { defineBackendModule } from '../moduleManifest';
import { dashboardV2Routes } from './routes';

export const dashboardModule = defineBackendModule({
  id: 'dashboard',
  domainFamily: 'reporting-analytics',
  routes: [
    {
      mountPath: '/dashboard',
      router: dashboardV2Routes,
    },
  ],
});
