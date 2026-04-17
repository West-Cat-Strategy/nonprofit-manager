import { Response } from 'express';
import type {
  EventMutationScope,
  EventRegistration,
} from '@app-types/event';
import type { DataScopeFilter } from '@app-types/dataScope';
import { AuthRequest } from '@middleware/auth';
import {
  requirePermissionSafe,
  sendForbidden,
  sendUnauthorized,
} from '@services/authGuardService';
import { Permission } from '@utils/permissions';
import { sendError } from '../../shared/http/envelope';
import { isEventHttpError } from '../eventHttpErrors';
import { EventCatalogUseCase } from '../usecases/eventCatalog.usecase';
import { EventRegistrationUseCase } from '../usecases/registration.usecase';

export interface EventCalendarPayload {
  event_id: string;
  event_name: string;
  description?: string | null;
  start_date: Date | string;
  end_date: Date | string;
  location_name?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

export const escapeIcsText = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');

export const toIcsUtc = (value: Date): string => {
  const iso = value.toISOString();
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
};

export const buildEventLocation = (event: EventCalendarPayload): string | null => {
  const parts = [
    event.location_name,
    event.address_line1,
    event.address_line2,
    event.city,
    event.state_province,
    event.postal_code,
    event.country,
  ]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter((part) => part.length > 0);

  return parts.length > 0 ? parts.join(', ') : null;
};

export const getScopeFilter = (req: AuthRequest): DataScopeFilter | undefined =>
  req.dataScope?.filter as DataScopeFilter | undefined;

export const getValidatedQuery = (req: AuthRequest): Record<string, unknown> =>
  ((req.validatedQuery ?? req.query) ?? {}) as Record<string, unknown>;

export const getValidatedParams = (req: AuthRequest): Record<string, string> =>
  ((req.validatedParams ?? req.params) ?? {}) as Record<string, string>;

export const resolveMutationScope = (value: unknown): EventMutationScope =>
  value === 'future_occurrences' || value === 'series' ? value : 'occurrence';

export const sendEventHttpError = (res: Response, error: unknown): boolean => {
  if (!isEventHttpError(error)) {
    return false;
  }

  sendError(res, error.code, error.message, error.statusCode);
  return true;
};

export interface EventsControllerSharedContext {
  ensurePermission: (req: AuthRequest, res: Response, permission: Permission) => boolean;
  ensureEventAccess: (eventId: string, req: AuthRequest, res: Response) => Promise<boolean>;
  ensureRegistrationEventAccess: (
    registrationId: string,
    req: AuthRequest,
    res: Response
  ) => Promise<EventRegistration | null>;
}

export const createEventsControllerSharedContext = (
  catalogUseCase: EventCatalogUseCase,
  registrationUseCase: EventRegistrationUseCase
): EventsControllerSharedContext => {
  const ensurePermission = (req: AuthRequest, res: Response, permission: Permission): boolean => {
    const guard = requirePermissionSafe(req, permission);
    if (!guard.ok) {
      if (guard.error.code === 'unauthorized') {
        sendUnauthorized(res, guard.error.message);
      } else {
        sendForbidden(res, guard.error.message || 'Forbidden');
      }
      return false;
    }

    return true;
  };

  const ensureEventAccess = async (
    eventId: string,
    req: AuthRequest,
    res: Response
  ): Promise<boolean> => {
    const scopedEvent = await catalogUseCase.getById(eventId, getScopeFilter(req));
    if (scopedEvent) {
      return true;
    }

    const unscopedEvent = await catalogUseCase.getById(eventId);
    if (unscopedEvent) {
      sendError(res, 'FORBIDDEN', 'Event is outside your data scope', 403);
      return false;
    }

    sendError(res, 'EVENT_NOT_FOUND', 'Event not found', 404);
    return false;
  };

  const ensureRegistrationEventAccess = async (
    registrationId: string,
    req: AuthRequest,
    res: Response
  ): Promise<EventRegistration | null> => {
    const registration = await registrationUseCase.getById(registrationId);
    if (!registration) {
      sendError(res, 'REGISTRATION_NOT_FOUND', 'Registration not found', 404);
      return null;
    }

    const canAccess = await ensureEventAccess(registration.event_id, req, res);
    if (!canAccess) {
      return null;
    }

    return registration;
  };

  return {
    ensurePermission,
    ensureEventAccess,
    ensureRegistrationEventAccess,
  };
};
