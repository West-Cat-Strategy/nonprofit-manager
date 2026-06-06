import { defineBackendModule } from '../moduleManifest';
import { alertsV2Routes } from './routes';

export const alertsModule = defineBackendModule({
  id: 'alerts',
  domainFamily: 'reporting-analytics',
  workspaceKey: 'alerts',
  routes: [
    {
      mountPath: '/alerts',
      router: alertsV2Routes,
    },
  ],
});
