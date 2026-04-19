import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BrutalButton, BrutalCard } from '../../../components/neo-brutalist';
import { formatDate, formatDateTime } from '../../../utils/format';
import { isUuid } from '../../../utils/uuid';
import {
  fetchContactPrintData,
  type ContactPrintData,
  type ContactPrintSectionKey,
} from '../api/contactPrintData';
import {
  getContactPrintSections,
  getContactPrintSummaryCards,
} from './contactPrint/registry';
import {
  PrintSection,
  SectionValue,
} from './contactPrint/shared';
import { buildContactName, formatMaybe } from './contactPrint/helpers';

type PrintStatus = 'loading' | 'ready' | 'error' | 'invalid';

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
              <BrutalButton variant="primary" onClick={() => navigate('/contacts')}>
                Back to People
              </BrutalButton>
              {status === 'error' && id ? (
                <BrutalButton variant="secondary" onClick={() => navigate(`/contacts/${id}`)}>
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
  const summaryCards = getContactPrintSummaryCards(data);
  const sections = getContactPrintSections({ data, sectionErrors });

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
          <BrutalButton variant="secondary" onClick={() => window.print()}>
            Print Now
          </BrutalButton>
          <BrutalButton variant="primary" onClick={() => navigate(`/contacts/${contact.contact_id}`)}>
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
              <SectionValue
                label="Preferred contact method"
                value={formatMaybe(contact.preferred_contact_method)}
              />
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
                    <span
                      key={role}
                      className="border border-black px-2 py-1 text-xs font-bold uppercase"
                    >
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
                <div className="text-[10px] uppercase tracking-[0.22em] text-black/55">
                  {card.label}
                </div>
                <div className="mt-1 text-xl font-black text-black">{card.value}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="space-y-6">
        {sections.map((section) => (
          <PrintSection
            key={section.key}
            title={section.title}
            subtitle={section.subtitle}
            count={section.count}
            hasContent={section.hasContent}
            error={section.error}
            emptyMessage={section.emptyMessage}
          >
            {section.content}
          </PrintSection>
        ))}
      </div>
    </div>
  );
};

export default ContactPrintPage;
