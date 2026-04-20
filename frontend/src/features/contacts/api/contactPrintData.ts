import api from '../../../services/api';
import type { Donation, PaginatedDonations } from '../../../types/donation';
import type { CaseWithDetails } from '../../../types/case';
import { activitiesApiClient } from '../../activities/api';
import type { ActivityRecord } from '../../activities/types';
import type {
  Contact,
  ContactCommunication,
  ContactCommunicationsResult,
  ContactDocument,
  ContactEmailAddress,
  ContactNote,
  ContactPhoneNumber,
  ContactRelationship,
} from '../../../types/contact';
import { contactsApiClient } from './contactsApiClient';
import { followUpsApiClient } from '../../followUps/api/followUpsApiClient';
import { listContactCasesForContact } from './contactCasesApi';
import type { FollowUp } from '../../../types/followup';

export type ContactPrintSectionKey =
  | 'phones'
  | 'emails'
  | 'relationships'
  | 'notes'
  | 'documents'
  | 'communications'
  | 'followUps'
  | 'cases'
  | 'activity'
  | 'payments';

export interface ContactPrintData {
  contact: Contact;
  phones: ContactPhoneNumber[];
  emails: ContactEmailAddress[];
  relationships: ContactRelationship[];
  notes: ContactNote[];
  documents: ContactDocument[];
  communications: ContactCommunication[];
  followUps: FollowUp[];
  cases: CaseWithDetails[];
  activity: ActivityRecord[];
  payments: Donation[];
}

export interface ContactPrintLoadResult {
  data: ContactPrintData;
  sectionErrors: Partial<Record<ContactPrintSectionKey, string>>;
}

const toErrorMessage = (reason: unknown, fallback: string): string => {
  if (reason instanceof Error && reason.message.trim()) {
    return reason.message;
  }

  if (typeof reason === 'string' && reason.trim()) {
    return reason;
  }

  return fallback;
};

const getSettledValue = <T>(result: PromiseSettledResult<T>, fallback: T): T =>
  result.status === 'fulfilled' ? result.value : fallback;

const fetchContactActivity = async (contactId: string): Promise<ActivityRecord[]> => {
  const response = await activitiesApiClient.getEntityActivities({
    entityType: 'contact',
    entityId: contactId,
  });
  return response.activities;
};

const fetchContactPayments = async (contactId: string): Promise<Donation[]> => {
  const params = new URLSearchParams();
  params.append('contact_id', contactId);
  params.append('limit', '100');
  params.append('sort_by', 'donation_date');
  params.append('sort_order', 'desc');

  const response = await api.get<PaginatedDonations>(`/donations?${params.toString()}`);
  return response.data.data || [];
};

export const fetchContactPrintData = async (contactId: string): Promise<ContactPrintLoadResult> => {
  const [
    contactResult,
    phonesResult,
    emailsResult,
    relationshipsResult,
    notesResult,
    documentsResult,
    communicationsResult,
    followUpsResult,
    casesResult,
    activityResult,
    paymentsResult,
  ] = await Promise.allSettled([
    contactsApiClient.getContact(contactId),
    contactsApiClient.listPhones(contactId),
    contactsApiClient.listEmails(contactId),
    contactsApiClient.listRelationships(contactId),
    contactsApiClient.listNotes(contactId),
    contactsApiClient.listDocuments(contactId),
    contactsApiClient.listCommunications(contactId, { limit: 100 }),
    followUpsApiClient.fetchEntityFollowUps('contact', contactId),
    listContactCasesForContact(contactId),
    fetchContactActivity(contactId),
    fetchContactPayments(contactId),
  ]);

  if (contactResult.status === 'rejected') {
    throw new Error(toErrorMessage(contactResult.reason, 'Failed to load contact'));
  }

  const emptyCommunicationsResult = {
    items: [],
    total: 0,
    filters: {},
  } satisfies ContactCommunicationsResult;

  const sectionErrors: Partial<Record<ContactPrintSectionKey, string>> = {};

  if (phonesResult.status === 'rejected') {
    sectionErrors.phones = toErrorMessage(phonesResult.reason, 'Failed to load phone numbers');
  }
  if (emailsResult.status === 'rejected') {
    sectionErrors.emails = toErrorMessage(emailsResult.reason, 'Failed to load email addresses');
  }
  if (relationshipsResult.status === 'rejected') {
    sectionErrors.relationships = toErrorMessage(relationshipsResult.reason, 'Failed to load relationships');
  }
  if (notesResult.status === 'rejected') {
    sectionErrors.notes = toErrorMessage(notesResult.reason, 'Failed to load notes');
  }
  if (documentsResult.status === 'rejected') {
    sectionErrors.documents = toErrorMessage(documentsResult.reason, 'Failed to load documents');
  }
  if (communicationsResult.status === 'rejected') {
    sectionErrors.communications = toErrorMessage(
      communicationsResult.reason,
      'Failed to load communications'
    );
  }
  if (followUpsResult.status === 'rejected') {
    sectionErrors.followUps = toErrorMessage(followUpsResult.reason, 'Failed to load follow-ups');
  }
  if (casesResult.status === 'rejected') {
    sectionErrors.cases = toErrorMessage(casesResult.reason, 'Failed to load cases');
  }
  if (activityResult.status === 'rejected') {
    sectionErrors.activity = toErrorMessage(activityResult.reason, 'Failed to load activity');
  }
  if (paymentsResult.status === 'rejected') {
    sectionErrors.payments = toErrorMessage(paymentsResult.reason, 'Failed to load payments');
  }

  return {
    data: {
      contact: contactResult.value,
      phones: getSettledValue(phonesResult, []),
      emails: getSettledValue(emailsResult, []),
      relationships: getSettledValue(relationshipsResult, []),
      notes: getSettledValue(notesResult, { notes: [], total: 0 }).notes,
      documents: getSettledValue(documentsResult, []),
      communications: getSettledValue(communicationsResult, emptyCommunicationsResult).items,
      followUps: getSettledValue(followUpsResult, []),
      cases: getSettledValue(casesResult, []),
      activity: getSettledValue(activityResult, []),
      payments: getSettledValue(paymentsResult, []),
    },
    sectionErrors,
  };
};
