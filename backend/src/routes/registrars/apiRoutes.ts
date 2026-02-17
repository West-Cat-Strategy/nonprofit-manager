import { Application } from 'express';
import { registerCoreRoutes } from './coreRoutes';
import { registerEngagementRoutes } from './engagementRoutes';
import { registerOperationsRoutes } from './operationsRoutes';
import { registerPortalRoutes } from './portalRoutes';

export function registerApiRoutes(app: Application): void {
  registerCoreRoutes(app);
  registerEngagementRoutes(app);
  registerOperationsRoutes(app);
  registerPortalRoutes(app);
}
