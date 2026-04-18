import { Pool } from 'pg';
import {
  CheckInOptions,
  CheckInResult,
  CreateRegistrationDTO,
  EventCheckInSettings,
  EventConfirmationEmailResult,
  EventRegistration,
  EventRegistrationMutationContext,
  EventMutationScope,
  EventWalkInCheckInDTO,
  EventWalkInCheckInResult,
  RegistrationFilters,
  RotateEventCheckInPinResult,
  UpdateEventCheckInSettingsDTO,
  UpdateRegistrationDTO,
} from '@app-types/event';
import type { DataScopeFilter } from '@app-types/dataScope';
import { EventConfirmationService } from './eventConfirmationService';
import { EventOccurrenceService } from './eventOccurrenceService';
import { EventParticipantSupport } from './shared';
import type { EventRegistrationServiceContext } from './eventRegistrationService.helpers';
import {
  checkInAttendeeMutation,
  walkInCheckInMutation,
} from './eventRegistrationService.checkIn';
import {
  cancelRegistrationMutation,
  registerContactMutation,
  sendRegistrationConfirmationEmailMutation,
  updateRegistrationMutation,
} from './eventRegistrationService.registrationMutations';
import {
  getEventCheckInSettingsQuery,
  rotateEventCheckInPinMutation,
  updateEventCheckInSettingsMutation,
} from './eventRegistrationService.checkInSettings';
import {
  getContactRegistrations,
  getEventRegistrations,
  getRegistrationById,
  getRegistrationByTokenAcrossScope,
  getRegistrationByTokenForEvent,
} from './eventRegistrationService.query';

export class EventRegistrationService {
  private readonly context: EventRegistrationServiceContext;
  private readonly support: EventParticipantSupport;
  private readonly occurrences: EventOccurrenceService;
  private readonly confirmations: EventConfirmationService;

  constructor(
    private readonly pool: Pool,
    support: EventParticipantSupport = new EventParticipantSupport(pool),
    occurrences: EventOccurrenceService = new EventOccurrenceService(pool),
    confirmations: EventConfirmationService = new EventConfirmationService(pool)
  ) {
    this.support = support;
    this.occurrences = occurrences;
    this.confirmations = confirmations;
    this.context = {
      pool: this.pool,
      support: this.support,
      occurrences: this.occurrences,
      confirmations: this.confirmations,
    };
  }

  async getEventRegistrations(
    eventId: string,
    filters: RegistrationFilters = {}
  ): Promise<EventRegistration[]> {
    return getEventRegistrations(this.context, eventId, filters);
  }

  async getContactRegistrations(
    contactId: string,
    scope?: DataScopeFilter
  ): Promise<EventRegistration[]> {
    return getContactRegistrations(this.context, contactId, scope);
  }

  async getRegistrationById(registrationId: string): Promise<EventRegistration | null> {
    return getRegistrationById(this.context, registrationId);
  }

  async getRegistrationByToken(eventId: string, token: string): Promise<EventRegistration | null> {
    return getRegistrationByTokenForEvent(this.context, eventId, token);
  }

  async getRegistrationByTokenGlobal(
    token: string,
    scope?: DataScopeFilter
  ): Promise<EventRegistration | null> {
    return getRegistrationByTokenAcrossScope(this.context, token, scope);
  }

  async registerContact(
    registrationData: CreateRegistrationDTO,
    context: EventRegistrationMutationContext = {}
  ): Promise<EventRegistration> {
    return registerContactMutation(this.context, registrationData, context);
  }

  async updateRegistration(
    registrationId: string,
    updateData: UpdateRegistrationDTO,
    scope: EventMutationScope,
    context: EventRegistrationMutationContext = {}
  ): Promise<EventRegistration> {
    return updateRegistrationMutation(this.context, registrationId, updateData, scope, context);
  }

  async checkInAttendee(
    registrationId: string,
    options: CheckInOptions = {}
  ): Promise<CheckInResult> {
    return checkInAttendeeMutation(this.context, registrationId, options);
  }

  async cancelRegistration(registrationId: string): Promise<void> {
    return cancelRegistrationMutation(this.context, registrationId);
  }

  async getEventCheckInSettings(
    eventId: string,
    occurrenceId?: string
  ): Promise<EventCheckInSettings | null> {
    return getEventCheckInSettingsQuery(this.context, eventId, occurrenceId);
  }

  async updateEventCheckInSettings(
    eventId: string,
    data: UpdateEventCheckInSettingsDTO,
    userId: string
  ): Promise<EventCheckInSettings | null> {
    return updateEventCheckInSettingsMutation(this.context, eventId, data, userId);
  }

  async rotateEventCheckInPin(
    eventId: string,
    userId: string,
    occurrenceId?: string
  ): Promise<RotateEventCheckInPinResult> {
    return rotateEventCheckInPinMutation(this.context, eventId, userId, occurrenceId);
  }

  async walkInCheckIn(
    eventId: string,
    data: EventWalkInCheckInDTO,
    checkedInBy: string
  ): Promise<EventWalkInCheckInResult> {
    return walkInCheckInMutation(this.context, eventId, data, checkedInBy);
  }

  async sendRegistrationConfirmationEmail(
    registrationId: string,
    sentBy: string | null
  ): Promise<EventConfirmationEmailResult> {
    return sendRegistrationConfirmationEmailMutation(this.context, registrationId, sentBy);
  }
}
