import { EventCatalogUseCase } from '../usecases/eventCatalog.usecase';
import { EventRegistrationUseCase } from '../usecases/registration.usecase';
import { EventRemindersUseCase } from '../usecases/reminders.usecase';
import { buildEventsCatalogHandlers } from './events.catalog.controller';
import { buildEventRegistrationHandlers } from './events.registration.controller';
import { buildEventReminderHandlers } from './events.reminders.controller';
import { createEventsControllerSharedContext } from './events.controller.shared';

export const createEventsController = (
  catalogUseCase: EventCatalogUseCase,
  registrationUseCase: EventRegistrationUseCase,
  remindersUseCase: EventRemindersUseCase
) => {
  const shared = createEventsControllerSharedContext(catalogUseCase, registrationUseCase);

  return {
    ...buildEventsCatalogHandlers(catalogUseCase, shared),
    ...buildEventRegistrationHandlers(registrationUseCase, shared),
    ...buildEventReminderHandlers(remindersUseCase, shared),
  };
};
