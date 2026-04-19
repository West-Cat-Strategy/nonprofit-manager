import type { EventRegistration, RegistrationFilters } from '@app-types/event';
import type { DataScopeFilter } from '@app-types/dataScope';
import {
  EventRegistrationServiceContext,
  getContactRegistrationsQuery,
  getEventRegistrationsQuery,
  getRegistrationByIdInternal,
  getRegistrationByToken,
  getRegistrationByTokenGlobal,
} from './eventRegistrationService.helpers';

export const getEventRegistrations = (
  ctx: EventRegistrationServiceContext,
  eventId: string,
  filters: RegistrationFilters = {}
): Promise<EventRegistration[]> => getEventRegistrationsQuery(ctx.pool, eventId, filters);

export const getContactRegistrations = (
  ctx: EventRegistrationServiceContext,
  contactId: string,
  scope?: DataScopeFilter
): Promise<EventRegistration[]> =>
  getContactRegistrationsQuery(ctx.pool, contactId, scope?.accountIds);

export const getRegistrationById = (
  ctx: EventRegistrationServiceContext,
  registrationId: string
): Promise<EventRegistration | null> => getRegistrationByIdInternal(registrationId, ctx.pool);

export const getRegistrationByTokenForEvent = (
  ctx: EventRegistrationServiceContext,
  eventId: string,
  token: string
): Promise<EventRegistration | null> => getRegistrationByToken(ctx.pool, eventId, token);

export const getRegistrationByTokenAcrossScope = (
  ctx: EventRegistrationServiceContext,
  token: string,
  scope?: DataScopeFilter
): Promise<EventRegistration | null> =>
  getRegistrationByTokenGlobal(ctx.pool, token, scope?.accountIds);
