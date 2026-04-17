import { Pool } from 'pg';
import {
  CheckInOptions,
  CheckInResult,
  CreateRegistrationDTO,
  EventCheckInSettings,
  EventRegistration,
  EventRegistrationMutationContext,
  EventWalkInCheckInDTO,
  EventWalkInCheckInResult,
  RotateEventCheckInPinResult,
  UpdateEventCheckInSettingsDTO,
  UpdateRegistrationDTO,
} from '@app-types/event';
import type { DataScopeFilter } from '@app-types/dataScope';
import { EventConfirmationService } from './eventConfirmationService';
import { EventOccurrenceService } from './eventOccurrenceService';
import { EventParticipantSupport } from './shared';
import {
  EventRegistrationServiceContext,
  getContactRegistrationsQuery,
  getEventRegistrationsQuery,
  getRegistrationByIdInternal,
  getRegistrationByToken,
  getRegistrationByTokenGlobal,
} from './eventRegistrationService.helpers';
import {
  cancelRegistrationMutation,
  checkInAttendeeMutation,
  getEventCheckInSettingsQuery,
  rotateEventCheckInPinMutation,
  updateEventCheckInSettingsMutation,
  walkInCheckInMutation,
} from './eventRegistrationService.checkIn';
import {
  registerContactMutation,
  updateRegistrationMutation,
} from './eventRegistrationService.registrationMutations';

export class EventRegistrationService {
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
  }

  private getContext(): EventRegistrationServiceContext {
    return {
      pool: this.pool,
      support: this.support,
      occurrences: this.occurrences,
      confirmations: this.confirmations,
    };
  }

  async getEventRegistrations(
    eventId: string,
    filters: {
      occurrence_id?: string;
      registration_status?: EventRegistration['registration_status'];
      checked_in?: boolean;
    } = {}
  ): Promise<EventRegistration[]> {
    return getEventRegistrationsQuery(this.pool, eventId, filters);
  }

  async getContactRegistrations(
    contactId: string,
    scope?: DataScopeFilter
  ): Promise<EventRegistration[]> {
    return getContactRegistrationsQuery(this.pool, contactId, scope?.createdByUserIds);
  }

  async getRegistrationById(registrationId: string): Promise<EventRegistration | null> {
    return getRegistrationByIdInternal(registrationId, this.pool);
  }

  async getRegistrationByToken(eventId: string, token: string): Promise<EventRegistration | null> {
    return getRegistrationByToken(this.pool, eventId, token);
  }

  async getRegistrationByTokenGlobal(
    token: string,
    scope?: DataScopeFilter
  ): Promise<EventRegistration | null> {
    return getRegistrationByTokenGlobal(this.pool, token, scope?.createdByUserIds);
  }

  async registerContact(
    registrationData: CreateRegistrationDTO,
    context: EventRegistrationMutationContext = {}
  ): Promise<EventRegistration> {
    return registerContactMutation(this.getContext(), registrationData, context);
  }

  async updateRegistration(
    registrationId: string,
    updateData: UpdateRegistrationDTO,
    context: EventRegistrationMutationContext = {}
  ): Promise<EventRegistration> {
    return updateRegistrationMutation(this.getContext(), registrationId, updateData, context);
  }

  async checkInAttendee(
    registrationId: string,
    options: CheckInOptions = {}
  ): Promise<CheckInResult> {
    return checkInAttendeeMutation(this.getContext(), registrationId, options);
  }

  async cancelRegistration(registrationId: string): Promise<void> {
    return cancelRegistrationMutation(this.getContext(), registrationId);
  }

  async getEventCheckInSettings(
    eventId: string,
    occurrenceId?: string
  ): Promise<EventCheckInSettings | null> {
    return getEventCheckInSettingsQuery(this.getContext(), eventId, occurrenceId);
  }

  async updateEventCheckInSettings(
    eventId: string,
    data: UpdateEventCheckInSettingsDTO,
    userId: string
  ): Promise<EventCheckInSettings | null> {
    return updateEventCheckInSettingsMutation(this.getContext(), eventId, data, userId);
  }

  async rotateEventCheckInPin(
    eventId: string,
    userId: string,
    occurrenceId?: string
  ): Promise<RotateEventCheckInPinResult> {
    return rotateEventCheckInPinMutation(this.getContext(), eventId, userId, occurrenceId);
  }

  async walkInCheckIn(
    eventId: string,
    data: EventWalkInCheckInDTO,
    checkedInBy: string
  ): Promise<EventWalkInCheckInResult> {
    return walkInCheckInMutation(this.getContext(), eventId, data, checkedInBy);
  }

  async sendRegistrationConfirmationEmail(
    registrationId: string,
    sentBy: string | null
  ) {
    return this.confirmations.sendRegistrationConfirmationEmail(registrationId, sentBy);
  }
}
