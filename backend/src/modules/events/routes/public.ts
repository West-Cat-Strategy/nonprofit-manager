import { Router } from 'express';
import { services } from '@container/services';
import { publishingService } from '@services/domains/content';
import { publicEventCheckInLimiterMiddleware } from '@middleware/domains/platform';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import {
  eventIdParamsSchema,
  publicEventCheckInSchema,
  publicEventRegistrationSchema,
  publicEventSlugParamsSchema,
  publicEventsQuerySchema,
  publicEventsSiteParamsSchema,
} from '@validations/event';
import { createPublicEventsController } from '../controllers/publicEvents.controller';
import { EventRepository } from '../repositories/eventRepository';
import { EventCatalogUseCase } from '../usecases/eventCatalog.usecase';
import { EventRegistrationUseCase } from '../usecases/registration.usecase';

export const createPublicEventsV2Routes = (): Router => {
  const repository = new EventRepository(services.event);
  const controller = createPublicEventsController({
    catalogUseCase: new EventCatalogUseCase(repository),
    registrationUseCase: new EventRegistrationUseCase(repository),
    siteResolver: publishingService,
  });
  const publicEventsV2Routes = Router();

  publicEventsV2Routes.get('/', validateQuery(publicEventsQuerySchema), controller.listPublicEvents);

  publicEventsV2Routes.get(
    '/sites/:siteKey',
    validateParams(publicEventsSiteParamsSchema),
    validateQuery(publicEventsQuerySchema),
    controller.listPublicEventsBySiteKey
  );

  publicEventsV2Routes.post(
    '/:id/registrations',
    validateParams(eventIdParamsSchema),
    validateQuery(publicEventsQuerySchema.partial()),
    validateBody(publicEventRegistrationSchema),
    controller.submitRegistration
  );

  publicEventsV2Routes.get(
    '/:id/check-in',
    validateParams(eventIdParamsSchema),
    controller.getCheckInInfo
  );

  publicEventsV2Routes.post(
    '/:id/check-in',
    publicEventCheckInLimiterMiddleware,
    validateParams(eventIdParamsSchema),
    validateBody(publicEventCheckInSchema),
    controller.submitCheckIn
  );

  publicEventsV2Routes.get(
    '/:slug',
    validateParams(publicEventSlugParamsSchema),
    validateQuery(publicEventsQuerySchema.partial()),
    controller.getPublicEventBySlug
  );

  return publicEventsV2Routes;
};

export const publicEventsV2Routes = createPublicEventsV2Routes();
