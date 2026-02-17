import { Application } from 'express';
import {
  adminRoutes,
  authRoutes,
  backupRoutes,
  ingestRoutes,
  plausibleRoutes,
  userRoutes,
} from '@routes/domains/core';

export function registerCoreRoutes(app: Application): void {
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/ingest', ingestRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/backup', backupRoutes);
  app.use('/api/plausible', plausibleRoutes);
}
