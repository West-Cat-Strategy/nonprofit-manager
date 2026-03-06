/**
 * Compatibility wrapper for legacy service imports.
 * Canonical alerts domain implementation now lives under `@modules/alerts`.
 */

import { Pool } from 'pg';
import { AlertsRepository } from '@modules/alerts/repositories/alerts.repository';
import { AlertsUseCase } from '@modules/alerts/usecases/alerts.usecase';

export class AlertService extends AlertsUseCase {
  constructor(pool: Pool) {
    super(new AlertsRepository(pool));
  }
}
