import { Application } from 'express';
import {
  exportRoutes,
  paymentRoutes,
  publishingRoutes,
  reconciliationRoutes,
  templateRoutes,
} from '@routes/domains/operations';

export function registerOperationsRoutes(app: Application): void {
  app.use('/api/payments', paymentRoutes);
  app.use('/api/reconciliation', reconciliationRoutes);
  app.use('/api/templates', templateRoutes);
  app.use('/api/sites', publishingRoutes);
  app.use('/api/export', exportRoutes);
}
