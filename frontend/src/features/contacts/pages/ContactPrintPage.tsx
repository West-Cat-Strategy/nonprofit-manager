import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BrutalButton, BrutalCard } from '../../../components/neo-brutalist';
import { formatBytes, formatCurrency, formatDate, formatDateTime } from '../../../utils/format';
import { getNoteTypeLabel } from '../../../utils/notes';
import { isUuid } from '../../../utils/uuid';
import { RELATIONSHIP_TYPES, type Contact } from '../../../types/contact';
import {
  fetchContactPrintData,
  type ContactPrintData,
  type ContactPrintSectionKey,
} from '../api/contactPrintData';

type PrintStatus = 'loading' | 'ready' | 'error' | 'invalid';

interface PrintSectionProps {
  title: string;
  subtitle?: string;
  count?: number;
  hasContent: boolean;
  error?: string | null;
  emptyMessage: string;
  children: ReactNode;
}

interface DefinitionItem {
  label: string;
  value: ReactNode;
}

const formatMaybe = (value: string | null | undefined): string => value?.trim() || '—';

const formatBoolean = (value: boolean): string => (value ? 'Yes' : 'No');

const buildContactName = (contact: Contact): string => {
  const parts = [
    contact.salutation,
    contact.preferred_name || contact.first_name,
    contact.middle_name,
    contact.last_name,
    contact.suffix,
  ].filter((part): part is string => Boolean(part && part.trim().length > 0));

  return parts.join(' ') || 'Contact';
};

const findRelationshipLabel = (relationshipType: string): string =>
  RELATIONSHIP_TYPES.find((entry) => entry.value === relationshipType)?.label ?? relationshipType;

function PrintSection({
  title,
  subtitle,
  count,
  hasContent,
  error,
  emptyMessage,
  children,
}: PrintSectionProps) {
  return (
    <section className="contact-print-section rounded-none border border-black bg-white px-5 py-4">
      <div className="mb-4 flex items-start justify-between gap-4 border-b border-black pb-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-black/60">{subtitle}</p>
          <h2 className="text-lg font-bold uppercase tracking-[0.08em] text-black">{title}</h2>
        </div>
        {typeof count === 'number' ? (
          <span className="shrink-0 border border-black px-2 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-black">
            {count}
          </span>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm font-medium text-black">{error}</p>
      ) : hasContent ? (
        children
      ) : (
        <p className="text-sm font-medium text-black/70">{emptyMessage}</p>
      )}
    </section>
  );
}

function DefinitionList({ items }: { items: DefinitionItem[] }) {
  return (
    <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="break-inside-avoid border border-black px-3 py-2">
          <dt className="text-[10px] uppercase tracking-[0.22em] text-black/55">{item.label}</dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm font-medium text-black">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PrintList({ children }: { children: ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

function PrintItemCard({ children }: { children: ReactNode }) {
  return <div className="break-inside-avoid border border-black px-4 py-3">{children}</div>;
}

function SectionValue({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="border border-black px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.22em] text-black/55">{label}</div>
      <div className="mt-1 text-sm font-medium text-black">{value}</div>
    </div>
  );
}

export const ContactPrintPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<PrintStatus>('loading');
  const [data, setData] = useState<ContactPrintData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sectionErrors, setSectionErrors] = useState<Partial<Record<ContactPrintSectionKey, string>>>(
    {}
  );
  const printTriggeredRef = useRef(false);

  const contactName = useMemo(() => (data ? buildContactName(data.contact) : 'Contact'), [data]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `Print / Export - ${contactName}`;

    return () => {
      document.title = previousTitle;
    };
  }, [contactName]);

  useEffect(() => {
    printTriggeredRef.current = false;

    if (!id) {
      setStatus('invalid');
      setErrorMessage('Missing contact identifier.');
      setData(null);
      setSectionErrors({});
      return;
    }

    if (!isUuid(id)) {
      setStatus('invalid');
      setErrorMessage('This contact link is invalid.');
      setData(null);
      setSectionErrors({});
      return;
    }

    let cancelled = false;

    const load = async () => {
      setStatus('loading');
      setErrorMessage(null);

      try {
        const result = await fetchContactPrintData(id);
        if (cancelled) {
          return;
        }

        setData(result.data);
        setSectionErrors(result.sectionErrors);
        setStatus('ready');
      } catch (error) {
        if (cancelled) {
          return;
        }

        setData(null);
        setSectionErrors({});
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load the print export.');
        setStatus('error');
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (status !== 'ready' || printTriggeredRef.current) {
      return;
    }

    printTriggeredRef.current = true;
    const timer = window.setTimeout(() => {
      window.print();
    }, 50);

    return () => window.clearTimeout(timer);
  }, [status]);

  if (status === 'invalid' || status === 'error') {
    return (
      <div className="contact-print-page flex min-h-screen items-center justify-center bg-app-accent-foreground px-6 py-12 text-app-brutal-ink">
        <BrutalCard color="yellow" className="w-full max-w-2xl p-6">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-black/55">
                Contact print export
              </p>
              <h1 className="mt-2 text-2xl font-black uppercase text-black">
                {status === 'invalid' ? 'Invalid contact link' : 'Unable to load export'}
              </h1>
            </div>
            <p className="text-sm font-medium text-black/80">
              {errorMessage || 'The contact print export could not be generated.'}
            </p>
            <div className="flex flex-wrap gap-3">
              <BrutalButton
                variant="primary"
                onClick={() => navigate('/contacts')}
              >
                Back to People
              </BrutalButton>
              {status === 'error' && id ? (
                <BrutalButton
                  variant="secondary"
                  onClick={() => navigate(`/contacts/${id}`)}
                >
                  Back to Contact
                </BrutalButton>
              ) : null}
            </div>
          </div>
        </BrutalCard>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="contact-print-page flex min-h-screen items-center justify-center bg-app-accent-foreground px-6 py-12 text-app-brutal-ink">
        <BrutalCard color="yellow" className="w-full max-w-2xl p-6">
          <div className="space-y-4 text-app-brutal-ink">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-app-brutal-ink">
              Contact print export
            </p>
            <h1 className="text-2xl font-black uppercase text-app-brutal-ink">
              Preparing printable contact summary
            </h1>
            <p className="text-sm font-medium text-app-brutal-ink">
              We&apos;re gathering the contact record, related notes, communications, cases, and
              documents before opening the browser print dialog.
            </p>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-app-brutal-ink border-t-transparent" />
              <span className="text-sm font-bold uppercase text-app-brutal-ink">
                Loading export data
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="border border-black bg-white px-4 py-3 text-sm font-bold text-black">
                Contact profile and identity details
              </div>
              <div className="border border-black bg-white px-4 py-3 text-sm font-bold text-black">
                Notes, follow-ups, and communications
              </div>
              <div className="border border-black bg-white px-4 py-3 text-sm font-bold text-black">
                Cases, relationships, and appointments
              </div>
              <div className="border border-black bg-white px-4 py-3 text-sm font-bold text-black">
                Documents, activity, and payment history
              </div>
            </div>
          </div>
        </BrutalCard>
      </div>
    );
  }

  const { contact } = data;
  const sectionErrorList = Object.values(sectionErrors).filter(Boolean);
  const displayName = buildContactName(contact);
  const addressFieldCount =
    [
      contact.address_line1,
      contact.address_line2,
      contact.city,
      contact.state_province,
      contact.postal_code,
      contact.country,
    ].filter((value) => Boolean(value && value.trim().length > 0)).length +
    (contact.no_fixed_address ? 1 : 0);

  const summaryCards = [
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

  return (
    <div className="contact-print-page min-h-screen bg-app-accent-foreground px-4 py-4 text-app-brutal-ink sm:px-6 lg:px-10">
      <div className="contact-print-no-print mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-black pb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-black/55">
            Contact print export
          </p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-[0.06em] text-black">
            {displayName}
          </h1>
          <p className="mt-2 text-sm font-medium text-black/70">
            Ready to print or save as a PDF from your browser.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <BrutalButton
            variant="secondary"
            onClick={() => window.print()}
          >
            Print Now
          </BrutalButton>
          <BrutalButton
            variant="primary"
            onClick={() => navigate(`/contacts/${contact.contact_id}`)}
          >
            Back to Contact
          </BrutalButton>
        </div>
      </div>

      {sectionErrorList.length > 0 ? (
        <div className="contact-print-section mb-6 border border-black bg-white px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-black/55">
            Partial export notice
          </p>
          <p className="mt-2 text-sm font-medium text-black">
            Some related sections could not be loaded. The rest of the export is still available.
          </p>
        </div>
      ) : null}

      <header className="contact-print-section mb-6 border border-black bg-white px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-black/55">
                Person file
              </p>
              <p className="mt-1 text-sm font-medium text-black/70">
                Contact ID: <span className="font-bold">{contact.contact_id}</span>
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <SectionValue label="Primary account" value={formatMaybe(contact.account_name)} />
              <SectionValue label="Active status" value={contact.is_active ? 'Active' : 'Inactive'} />
              <SectionValue label="Preferred name" value={formatMaybe(contact.preferred_name)} />
              <SectionValue label="Job title" value={formatMaybe(contact.job_title)} />
              <SectionValue label="Department" value={formatMaybe(contact.department)} />
              <SectionValue label="Preferred contact method" value={formatMaybe(contact.preferred_contact_method)} />
              <SectionValue label="Primary email" value={formatMaybe(contact.email)} />
              <SectionValue label="Primary phone" value={formatMaybe(contact.phone)} />
              <SectionValue label="Mobile phone" value={formatMaybe(contact.mobile_phone)} />
              <SectionValue label="Pronouns" value={formatMaybe(contact.pronouns)} />
              <SectionValue label="Gender" value={formatMaybe(contact.gender)} />
              <SectionValue label="PHN" value={formatMaybe(contact.phn)} />
              <SectionValue label="Date of birth" value={formatMaybe(formatDate(contact.birth_date))} />
              <SectionValue label="Record notes" value={formatMaybe(contact.notes)} />
              <SectionValue label="Created" value={formatDateTime(contact.created_at)} />
              <SectionValue label="Updated" value={formatDateTime(contact.updated_at)} />
            </div>
          </div>
          <div className="max-w-sm space-y-2 text-sm">
            <div className="border border-black px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
                Roles
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(contact.roles || []).length > 0 ? (
                  contact.roles?.map((role) => (
                    <span key={role} className="border border-black px-2 py-1 text-xs font-bold uppercase">
                      {role}
                    </span>
                  ))
                ) : (
                  <span className="text-sm font-medium text-black/70">No roles</span>
                )}
              </div>
            </div>
            <div className="border border-black px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
                Tags
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {contact.tags.length > 0 ? (
                  contact.tags.map((tag) => (
                    <span key={tag} className="border border-black px-2 py-1 text-xs font-bold">
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-sm font-medium text-black/70">No tags</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-black pt-4">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <div key={card.label} className="border border-black px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.22em] text-black/55">{card.label}</div>
                <div className="mt-1 text-xl font-black text-black">{card.value}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="space-y-6">
        <PrintSection
          title="Core Details"
          subtitle="Identity and profile"
          count={22}
          hasContent
          error={null}
          emptyMessage="No core details available."
        >
          <DefinitionList
            items={[
              { label: 'Full name', value: displayName },
              { label: 'Salutation', value: formatMaybe(contact.salutation) },
              { label: 'Suffix', value: formatMaybe(contact.suffix) },
              { label: 'Account name', value: formatMaybe(contact.account_name) },
              { label: 'Account ID', value: formatMaybe(contact.account_id) },
              { label: 'Contact ID', value: contact.contact_id },
              { label: 'Active', value: contact.is_active ? 'Yes' : 'No' },
              { label: 'No fixed address', value: formatBoolean(contact.no_fixed_address) },
              { label: 'Do not email', value: formatBoolean(contact.do_not_email) },
              { label: 'Do not phone', value: formatBoolean(contact.do_not_phone) },
              { label: 'Do not text', value: formatBoolean(contact.do_not_text) },
              { label: 'Do not voicemail', value: formatBoolean(contact.do_not_voicemail) },
            ]}
          />
        </PrintSection>

        <PrintSection
          title="Address"
          subtitle="Location and delivery"
          count={addressFieldCount}
          hasContent={addressFieldCount > 0}
          error={null}
          emptyMessage="No address is recorded for this contact."
        >
          <DefinitionList
            items={[
              { label: 'Address line 1', value: formatMaybe(contact.address_line1) },
              { label: 'Address line 2', value: formatMaybe(contact.address_line2) },
              { label: 'City', value: formatMaybe(contact.city) },
              { label: 'State / Province', value: formatMaybe(contact.state_province) },
              { label: 'Postal code', value: formatMaybe(contact.postal_code) },
              { label: 'Country', value: formatMaybe(contact.country) },
              { label: 'No fixed address', value: formatBoolean(contact.no_fixed_address) },
            ]}
          />
        </PrintSection>

        <PrintSection
          title="Phone Numbers"
          subtitle="Communication channels"
          count={data.phones.length}
          hasContent={data.phones.length > 0}
          error={sectionErrors.phones}
          emptyMessage="No phone numbers are on file."
        >
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
        </PrintSection>

        <PrintSection
          title="Email Addresses"
          subtitle="Communication channels"
          count={data.emails.length}
          hasContent={data.emails.length > 0}
          error={sectionErrors.emails}
          emptyMessage="No email addresses are on file."
        >
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
        </PrintSection>

        <PrintSection
          title="Relationships"
          subtitle="Connections and support network"
          count={data.relationships.length}
          hasContent={data.relationships.length > 0}
          error={sectionErrors.relationships}
          emptyMessage="No relationships are on file."
        >
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
                      {relationship.relationship_label ? ` - ${relationship.relationship_label}` : ''}
                    </p>
                    {relationship.notes ? (
                      <p className="text-sm text-black whitespace-pre-wrap">{relationship.notes}</p>
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
        </PrintSection>

        <PrintSection
          title="Notes"
          subtitle="Record of interactions and observations"
          count={data.notes.length}
          hasContent={data.notes.length > 0}
          error={sectionErrors.notes}
          emptyMessage="No notes are on file."
        >
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
                    <p className="text-base font-bold text-black">{note.subject || 'Untitled note'}</p>
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
        </PrintSection>

        <PrintSection
          title="Documents"
          subtitle="Files and attachments"
          count={data.documents.length}
          hasContent={data.documents.length > 0}
          error={sectionErrors.documents}
          emptyMessage="No documents are on file."
        >
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
                      <p className="text-sm text-black whitespace-pre-wrap">{document.description}</p>
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
        </PrintSection>

        <PrintSection
          title="Communications"
          subtitle="Email and SMS delivery history"
          count={data.communications.length}
          hasContent={data.communications.length > 0}
          error={sectionErrors.communications}
          emptyMessage="No communications are on file."
        >
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
                      <p className="text-sm text-black/80">{communication.source_subtitle}</p>
                    ) : null}
                    <p className="text-sm text-black/80">Recipient: {communication.recipient}</p>
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
        </PrintSection>

        <PrintSection
          title="Follow-ups"
          subtitle="Action items and reminders"
          count={data.followUps.length}
          hasContent={data.followUps.length > 0}
          error={sectionErrors.followUps}
          emptyMessage="No follow-ups are on file."
        >
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
                      <p className="mt-1 whitespace-pre-wrap text-sm text-black">{followUp.description}</p>
                    ) : null}
                    <p className="mt-1 text-sm text-black/80">
                      Scheduled for {formatDate(followUp.scheduled_date)}
                      {followUp.scheduled_time ? ` at ${followUp.scheduled_time}` : ''}
                    </p>
                    {followUp.assigned_to_name ? (
                      <p className="text-sm text-black/80">Assigned to {followUp.assigned_to_name}</p>
                    ) : null}
                  </div>
                </div>
              </PrintItemCard>
            ))}
          </PrintList>
        </PrintSection>

        <PrintSection
          title="Cases"
          subtitle="Associated case records"
          count={data.cases.length}
          hasContent={data.cases.length > 0}
          error={sectionErrors.cases}
          emptyMessage="No associated cases are on file."
        >
          <PrintList>
            {data.cases.map((caseRecord) => (
              <PrintItemCard key={caseRecord.id}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <p className="text-base font-bold text-black">
                      {caseRecord.case_number} - {caseRecord.title}
                    </p>
                    <p className="text-sm text-black/80">
                      {caseRecord.case_type_name || 'Case'} • {caseRecord.status_name || caseRecord.status_id}
                    </p>
                    {caseRecord.description ? (
                      <p className="text-sm text-black whitespace-pre-wrap">{caseRecord.description}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1 text-xs font-medium uppercase tracking-[0.14em] text-black/55">
                    <div>Priority: {caseRecord.priority}</div>
                    <div>Intake: {formatDate(caseRecord.intake_date)}</div>
                    {caseRecord.closed_date ? <div>Closed: {formatDate(caseRecord.closed_date)}</div> : null}
                  </div>
                </div>
              </PrintItemCard>
            ))}
          </PrintList>
        </PrintSection>

        <PrintSection
          title="Activity"
          subtitle="Timeline of contact activity"
          count={data.activity.length}
          hasContent={data.activity.length > 0}
          error={sectionErrors.activity}
          emptyMessage="No activity has been recorded yet."
        >
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
                    <p className="mt-1 whitespace-pre-wrap text-sm text-black">{activity.description}</p>
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
        </PrintSection>

        <PrintSection
          title="Payments"
          subtitle="Donation history"
          count={data.payments.length}
          hasContent={data.payments.length > 0}
          error={sectionErrors.payments}
          emptyMessage="No payments are on file."
        >
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
                      <p className="text-sm text-black whitespace-pre-wrap">{payment.notes}</p>
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
        </PrintSection>
      </div>
    </div>
  );
};

export default ContactPrintPage;
