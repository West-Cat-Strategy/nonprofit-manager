import { EventRegistrationUseCase } from '../usecases/registration.usecase';
import type { EventsControllerSharedContext } from './events.controller.shared';
import { buildEventRegistrationCheckInHandlers } from './events.registration.checkIn.controller';
import { buildEventRegistrationMutationHandlers } from './events.registration.mutation.controller';
import { buildEventRegistrationQueryHandlers } from './events.registration.query.controller';
import { buildEventRegistrationSettingsHandlers } from './events.registration.settings.controller';

export const buildEventRegistrationHandlers = (
  registrationUseCase: EventRegistrationUseCase,
  shared: EventsControllerSharedContext
) => ({
  ...buildEventRegistrationQueryHandlers(registrationUseCase, shared),
  ...buildEventRegistrationMutationHandlers(registrationUseCase, shared),
  ...buildEventRegistrationCheckInHandlers(registrationUseCase, shared),
  ...buildEventRegistrationSettingsHandlers(registrationUseCase, shared),
});
