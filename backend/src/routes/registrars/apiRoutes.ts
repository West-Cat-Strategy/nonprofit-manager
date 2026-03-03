import { Application } from 'express';
import { registerV2Routes } from './v2Routes';

export function registerApiRoutes(app: Application): void {
  registerV2Routes(app);
}
