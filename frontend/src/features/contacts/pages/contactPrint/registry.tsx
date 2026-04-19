import type { ReactNode } from 'react';
import { formatBytes, formatCurrency, formatDate, formatDateTime } from '../../../../utils/format';
import { getNoteTypeLabel } from '../../../../utils/notes';
import type {
  ContactPrintData,
  ContactPrintSectionKey,
} from '../../api/contactPrintData';
import {
  DefinitionList,
  PrintItemCard,
  PrintList,
} from './shared';
import {
  buildContactName,
  findRelationshipLabel,
  formatBoolean,
  formatMaybe,
} from './helpers';

export interface ContactPrintSectionDefinition {
  key: string;
  title: string;
  subtitle: string;
  count?: number;
  hasContent: boolean;
  error?: string | null;
  emptyMessage: string;
  content: ReactNode;
}

export const getContactPrintAddressFieldCount = (data: ContactPrintData): number =>
  [
    data.contact.address_line1,
    data.contact.address_line2,
    data.contact.city,
    data.contact.state_province,
    data.contact.postal_code,
    data.contact.country,
  ].filter((value) => Boolean(value && value.trim().length > 0)).length +
  (data.contact.no_fixed_address ? 1 : 0);

export const getContactPrintSummaryCards = (data: ContactPrintData) => [
  { label: 'Phones', value: data.phones.length },
  { label: 'Emails', value: data.emails.length },
  { label: 'Relationships', value: data.relationships.length },
  { label: 'Notes', value: data.notes.length },
  { label: 'Documents', value: data.documents.length },
  { label: 'Communications', value: data.communications.length },
  { label: 'Follow-ups', value: data.followUps.length },
  { label: 'Cases', value: data.cases.length },
  { label: 'Payments', value: data.payments.length },
  { label: 'Activity', value: data.activity.length },
];

export function getContactPrintSections({
  data,
  sectionErrors,
}: {
  data: ContactPrintData;
  sectionErrors: Partial<Record<ContactPrintSectionKey, string>>;
}): ContactPrintSectionDefinition[] {
  const displayName = buildContactName(data.contact);
  const addressFieldCount = getContactPrintAddressFieldCount(data);

  return [
    {
      key: 'core-details',
      title: 'Core Details',
      subtitle: 'Identity and profile',
      count: 22,
      hasContent: true,
      emptyMessage: 'No core details available.',
      content: (
        <DefinitionList
          items={[
            { label: 'Full name', value: displayName },
            { label: 'Salutation', value: formatMaybe(data.contact.salutation) },
            { label: 'Suffix', value: formatMaybe(data.contact.suffix) },
            { label: 'Account name', value: formatMaybe(data.contact.account_name) },
            { label: 'Account ID', value: formatMaybe(data.contact.account_id) },
            { label: 'Contact ID', value: data.contact.contact_id },
            { label: 'Active', value: data.contact.is_active ? 'Yes' : 'No' },
            {
              label: 'No fixed address',
              value: formatBoolean(data.contact.no_fixed_address),
            },
            { label: 'Do not email', value: formatBoolean(data.contact.do_not_email) },
            { label: 'Do not phone', value: formatBoolean(data.contact.do_not_phone) },
            { label: 'Do not text', value: formatBoolean(data.contact.do_not_text) },
            {
              label: 'Do not voicemail',
              value: formatBoolean(data.contact.do_not_voicemail),
            },
          ]}
        />
      ),
    },
    {
      key: 'address',
      title: 'Address',
      subtitle: 'Location and delivery',
      count: addressFieldCount,
      hasContent: addressFieldCount > 0,
      emptyMessage: 'No address is recorded for this contact.',
      content: (
        <DefinitionList
          items={[
            { label: 'Address line 1', value: formatMaybe(data.contact.address_line1) },
            { label: 'Address line 2', value: formatMaybe(data.contact.address_line2) },
            { label: 'City', value: formatMaybe(data.contact.city) },
            {
              label: 'State / Province',
              value: formatMaybe(data.contact.state_province),
            },
            { label: 'Postal code', value: formatMaybe(data.contact.postal_code) },
            { label: 'Country', value: formatMaybe(data.contact.country) },
            {
              label: 'No fixed address',
              value: formatBoolean(data.contact.no_fixed_address),
            },
          ]}
        />
      ),
    },
    {
      key: 'phones',
      title: 'Phone Numbers',
      subtitle: 'Communication channels',
      count: data.phones.length,
      hasContent: data.phones.length > 0,
      error: sectionErrors.phones,
      emptyMessage: 'No phone numbers are on file.',
      content: (
        <PrintList>
          {data.phones.map((phone) => (
            <PrintItemCard key={phone.id}>
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.14em] text-black">
                    {phone.label}
                    {phone.is_primary ? ' - Primary' : ''}
                  </p>
                  <p className="mt-1 text-base font-medium text-black">{phone.phone_number}</p>
                </div>
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-black/55">
                  Updated {formatDateTime(phone.updated_at)}
                </div>
              </div>
            </PrintItemCard>
          ))}
        </PrintList>
      ),
    },
    {
      key: 'emails',
      title: 'Email Addresses',
      subtitle: 'Communication channels',
      count: data.emails.length,
      hasContent: data.emails.length > 0,
      error: sectionErrors.emails,
      emptyMessage: 'No email addresses are on file.',
      content: (
        <PrintList>
          {data.emails.map((email) => (
            <PrintItemCard key={email.id}>
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.14em] text-black">
                    {email.label}
                    {email.is_primary ? ' - Primary' : ''}
                  </p>
                  <p className="mt-1 text-base font-medium text-black">{email.email_address}</p>
                </div>
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-black/55">
                  Updated {formatDateTime(email.updated_at)}
                </div>
              </div>
            </PrintItemCard>
          ))}
        </PrintList>
      ),
    },
    {
      key: 'relationships',
      title: 'Relationships',
      subtitle: 'Connections and support network',
      count: data.relationships.length,
      hasContent: data.relationships.length > 0,
      error: sectionErrors.relationships,
      emptyMessage: 'No relationships are on file.',
      content: (
        <PrintList>
          {data.relationships.map((relationship) => (
            <PrintItemCard key={relationship.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <p className="text-base font-bold text-black">
                    {relationship.related_contact_first_name || 'Unknown'}{' '}
                    {relationship.related_contact_last_name || ''}
                  </p>
                  <p className="text-sm font-medium text-black/80">
                    {findRelationshipLabel(relationship.relationship_type)}
                    {relationship.relationship_label
                      ? ` - ${relationship.relationship_label}`
                      : ''}
                  </p>
                  {relationship.notes ? (
                    <p className="whitespace-pre-wrap text-sm text-black">
                      {relationship.notes}
                    </p>
                  ) : null}
                </div>
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-black/55">
                  {relationship.is_bidirectional ? 'Bidirectional' : 'One-way'}
                  {' • '}
                  {relationship.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
            </PrintItemCard>
          ))}
        </PrintList>
      ),
    },
    {
      key: 'notes',
      title: 'Notes',
      subtitle: 'Record of interactions and observations',
      count: data.notes.length,
      hasContent: data.notes.length > 0,
      error: sectionErrors.notes,
      emptyMessage: 'No notes are on file.',
      content: (
        <PrintList>
          {data.notes.map((note) => (
            <PrintItemCard key={note.id}>
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="border border-black px-2 py-1 text-xs font-bold uppercase tracking-[0.14em]">
                    {getNoteTypeLabel(note.note_type)}
                  </span>
                  {note.is_alert ? (
                    <span className="border border-black px-2 py-1 text-xs font-bold uppercase tracking-[0.14em]">
                      Alert
                    </span>
                  ) : null}
                  {note.is_important ? (
                    <span className="border border-black px-2 py-1 text-xs font-bold uppercase tracking-[0.14em]">
                      Important
                    </span>
                  ) : null}
                  {note.is_internal ? (
                    <span className="border border-black px-2 py-1 text-xs font-bold uppercase tracking-[0.14em]">
                      Internal
                    </span>
                  ) : null}
                </div>
                <div>
                  <p className="text-base font-bold text-black">
                    {note.subject || 'Untitled note'}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-black">{note.content}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-[0.14em] text-black/55">
                  <span>{formatDateTime(note.created_at)}</span>
                  {note.case_number ? <span>Case {note.case_number}</span> : null}
                  {note.created_by_first_name || note.created_by_last_name ? (
                    <span>
                      {note.created_by_first_name} {note.created_by_last_name}
                    </span>
                  ) : null}
                </div>
              </div>
            </PrintItemCard>
          ))}
        </PrintList>
      ),
    },
    {
      key: 'documents',
      title: 'Documents',
      subtitle: 'Files and attachments',
      count: data.documents.length,
      hasContent: data.documents.length > 0,
      error: sectionErrors.documents,
      emptyMessage: 'No documents are on file.',
      content: (
        <PrintList>
          {data.documents.map((document) => (
            <PrintItemCard key={document.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <p className="text-base font-bold text-black">
                    {document.title || document.original_name}
                  </p>
                  <p className="text-sm text-black/80">
                    {document.document_type}
                    {document.case_number ? ` • Case ${document.case_number}` : ''}
                  </p>
                  {document.description ? (
                    <p className="whitespace-pre-wrap text-sm text-black">
                      {document.description}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1 text-xs font-medium uppercase tracking-[0.14em] text-black/55">
                  <div>{formatBytes(document.file_size)}</div>
                  <div>{formatDateTime(document.created_at)}</div>
                  <div>{document.is_portal_visible ? 'Portal visible' : 'Internal only'}</div>
                </div>
              </div>
            </PrintItemCard>
          ))}
        </PrintList>
      ),
    },
    {
      key: 'communications',
      title: 'Communications',
      subtitle: 'Email and SMS delivery history',
      count: data.communications.length,
      hasContent: data.communications.length > 0,
      error: sectionErrors.communications,
      emptyMessage: 'No communications are on file.',
      content: (
        <PrintList>
          {data.communications.map((communication) => (
            <PrintItemCard key={communication.id}>
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="border border-black px-2 py-1 text-xs font-bold uppercase tracking-[0.14em]">
                    {communication.channel}
                  </span>
                  <span className="border border-black px-2 py-1 text-xs font-bold uppercase tracking-[0.14em]">
                    {communication.delivery_status}
                  </span>
                  <span className="border border-black px-2 py-1 text-xs font-bold uppercase tracking-[0.14em]">
                    {communication.trigger_type}
                  </span>
                </div>
                <div>
                  <p className="text-base font-bold text-black">{communication.source_label}</p>
                  {communication.source_subtitle ? (
                    <p className="text-sm text-black/80">
                      {communication.source_subtitle}
                    </p>
                  ) : null}
                  <p className="text-sm text-black/80">
                    Recipient: {communication.recipient}
                  </p>
                  {communication.message_preview ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-black">
                      {communication.message_preview}
                    </p>
                  ) : null}
                  {communication.error_message ? (
                    <p className="mt-2 text-sm font-medium text-black">
                      Error: {communication.error_message}
                    </p>
                  ) : null}
                </div>
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-black/55">
                  Sent {formatDateTime(communication.sent_at)}
                </div>
              </div>
            </PrintItemCard>
          ))}
        </PrintList>
      ),
    },
    {
      key: 'followUps',
      title: 'Follow-ups',
      subtitle: 'Action items and reminders',
      count: data.followUps.length,
      hasContent: data.followUps.length > 0,
      error: sectionErrors.followUps,
      emptyMessage: 'No follow-ups are on file.',
      content: (
        <PrintList>
          {data.followUps.map((followUp) => (
            <PrintItemCard key={followUp.id}>
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="border border-black px-2 py-1 text-xs font-bold uppercase tracking-[0.14em]">
                    {followUp.status}
                  </span>
                  <span className="border border-black px-2 py-1 text-xs font-bold uppercase tracking-[0.14em]">
                    {followUp.frequency}
                  </span>
                  {followUp.method ? (
                    <span className="border border-black px-2 py-1 text-xs font-bold uppercase tracking-[0.14em]">
                      {followUp.method}
                    </span>
                  ) : null}
                </div>
                <div>
                  <p className="text-base font-bold text-black">{followUp.title}</p>
                  {followUp.description ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-black">
                      {followUp.description}
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm text-black/80">
                    Scheduled for {formatDate(followUp.scheduled_date)}
                    {followUp.scheduled_time ? ` at ${followUp.scheduled_time}` : ''}
                  </p>
                  {followUp.assigned_to_name ? (
                    <p className="text-sm text-black/80">
                      Assigned to {followUp.assigned_to_name}
                    </p>
                  ) : null}
                </div>
              </div>
            </PrintItemCard>
          ))}
        </PrintList>
      ),
    },
    {
      key: 'cases',
      title: 'Cases',
      subtitle: 'Associated case records',
      count: data.cases.length,
      hasContent: data.cases.length > 0,
      error: sectionErrors.cases,
      emptyMessage: 'No associated cases are on file.',
      content: (
        <PrintList>
          {data.cases.map((caseRecord) => (
            <PrintItemCard key={caseRecord.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <p className="text-base font-bold text-black">
                    {caseRecord.case_number} - {caseRecord.title}
                  </p>
                  <p className="text-sm text-black/80">
                    {caseRecord.case_type_name || 'Case'} •{' '}
                    {caseRecord.status_name || caseRecord.status_id}
                  </p>
                  {caseRecord.description ? (
                    <p className="whitespace-pre-wrap text-sm text-black">
                      {caseRecord.description}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1 text-xs font-medium uppercase tracking-[0.14em] text-black/55">
                  <div>Priority: {caseRecord.priority}</div>
                  <div>Intake: {formatDate(caseRecord.intake_date)}</div>
                  {caseRecord.closed_date ? (
                    <div>Closed: {formatDate(caseRecord.closed_date)}</div>
                  ) : null}
                </div>
              </div>
            </PrintItemCard>
          ))}
        </PrintList>
      ),
    },
    {
      key: 'activity',
      title: 'Activity',
      subtitle: 'Timeline of contact activity',
      count: data.activity.length,
      hasContent: data.activity.length > 0,
      error: sectionErrors.activity,
      emptyMessage: 'No activity has been recorded yet.',
      content: (
        <PrintList>
          {data.activity.map((activity) => (
            <PrintItemCard key={activity.id}>
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="border border-black px-2 py-1 text-xs font-bold uppercase tracking-[0.14em]">
                    {activity.type}
                  </span>
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-black/55">
                    {formatDateTime(activity.timestamp)}
                  </span>
                </div>
                <div>
                  <p className="text-base font-bold text-black">{activity.title}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-black">
                    {activity.description}
                  </p>
                  {activity.user_name ? (
                    <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-black/55">
                      Recorded by {activity.user_name}
                    </p>
                  ) : null}
                </div>
              </div>
            </PrintItemCard>
          ))}
        </PrintList>
      ),
    },
    {
      key: 'payments',
      title: 'Payments',
      subtitle: 'Donation history',
      count: data.payments.length,
      hasContent: data.payments.length > 0,
      error: sectionErrors.payments,
      emptyMessage: 'No payments are on file.',
      content: (
        <PrintList>
          {data.payments.map((payment) => (
            <PrintItemCard key={payment.donation_id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <p className="text-base font-bold text-black">
                    {formatCurrency(payment.amount, payment.currency)}
                  </p>
                  <p className="text-sm text-black/80">
                    {payment.donation_number}
                    {payment.campaign_name ? ` • ${payment.campaign_name}` : ''}
                    {payment.designation ? ` • ${payment.designation}` : ''}
                  </p>
                  <p className="text-sm text-black/80">
                    Status: {payment.payment_status}
                    {payment.payment_method ? ` • Method: ${payment.payment_method}` : ''}
                  </p>
                  {payment.notes ? (
                    <p className="whitespace-pre-wrap text-sm text-black">
                      {payment.notes}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1 text-xs font-medium uppercase tracking-[0.14em] text-black/55">
                  <div>{formatDate(payment.donation_date)}</div>
                  {payment.is_recurring ? <div>Recurring</div> : null}
                  {payment.receipt_sent ? <div>Receipt sent</div> : null}
                </div>
              </div>
            </PrintItemCard>
          ))}
        </PrintList>
      ),
    },
  ];
}
