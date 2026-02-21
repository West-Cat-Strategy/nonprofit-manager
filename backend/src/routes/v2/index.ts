import { Router } from 'express';
import { portalV2Routes } from '@modules/portal';
import { eventsV2Routes } from '@modules/events';

export const apiV2Routes = Router();

apiV2Routes.use('/portal', portalV2Routes);
apiV2Routes.use('/events', eventsV2Routes);
