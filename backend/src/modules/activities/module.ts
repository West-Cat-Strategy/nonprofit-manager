import { defineBackendModule } from '../moduleManifest';
import { activitiesV2Routes } from './routes';

export const activitiesModule = defineBackendModule({
  id: 'activities',
  domainFamily: 'engagement',
  routes: [
    {
      mountPath: '/activities',
      router: activitiesV2Routes,
    },
  ],
});
