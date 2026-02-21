import { Application } from 'express';
import { registerCoreRoutes } from './coreRoutes';
import { registerEngagementRoutes } from './engagementRoutes';
import { registerOperationsRoutes } from './operationsRoutes';
import { registerPortalRoutes } from './portalRoutes';
import { registerV2Routes } from './v2Routes';

export function registerApiRoutes(app: Application): void {
  registerV2Routes(app);
  registerCoreRoutes(app);
  registerEngagementRoutes(app);
  registerOperationsRoutes(app);
  registerPortalRoutes(app);
}
