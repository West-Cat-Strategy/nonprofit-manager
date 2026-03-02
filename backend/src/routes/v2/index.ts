import { Router } from 'express';
import { portalV2Routes } from '@modules/portal';
import { eventsV2Routes } from '@modules/events';
import { casesV2Routes } from '@modules/cases';
import { contactsV2Routes } from '@modules/contacts';
import { opportunitiesV2Routes } from '@modules/opportunities';

export const apiV2Routes = Router();

apiV2Routes.use('/portal', portalV2Routes);
apiV2Routes.use('/events', eventsV2Routes);
apiV2Routes.use('/cases', casesV2Routes);
apiV2Routes.use('/contacts', contactsV2Routes);
apiV2Routes.use('/opportunities', opportunitiesV2Routes);
