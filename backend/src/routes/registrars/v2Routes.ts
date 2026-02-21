import { Application } from 'express';
import { apiV2Routes } from '@routes/v2';

export function registerV2Routes(app: Application): void {
  const v2Enabled = process.env.API_V2_ENABLED !== 'false';
  if (!v2Enabled) {
    return;
  }

  app.use('/api/v2', apiV2Routes);
}
