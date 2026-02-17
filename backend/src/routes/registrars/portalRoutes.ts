import { Application } from 'express';
import { portalAdminRoutes, portalAuthRoutes, portalRoutes } from '@routes/domains/portal';

export function registerPortalRoutes(app: Application): void {
  app.use('/api/portal/auth', portalAuthRoutes);
  app.use('/api/portal', portalRoutes);
  app.use('/api/portal/admin', portalAdminRoutes);
}
