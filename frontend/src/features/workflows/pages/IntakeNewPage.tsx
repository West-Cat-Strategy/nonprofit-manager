import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CaseForm from '../../../components/CaseForm';
import { ContactForm } from '../../contacts/components/contactForm';
import { contactsApiClient } from '../../contacts/api/contactsApiClient';
import type { CaseWithDetails } from '../../../types/case';
import type { Contact } from '../../contacts/state';
import WorkflowStepper, { type WorkflowStep } from '../components/WorkflowStepper';

const SESSION_STORAGE_KEY = 'workflow:intake:new';

type IntakeStep = 'contact' | 'case';

interface IntakeDraftSnapshot {
  step: IntakeStep;
  createdContact: Pick<Contact, 'contact_id' | 'first_name' | 'last_name' | 'email'> | null;
}

const IntakeNew = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<IntakeStep>('contact');
  const [createdContact, setCreatedContact] = useState<IntakeDraftSnapshot['createdContact']>(null);
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [restoredContactIdToValidate, setRestoredContactIdToValidate] = useState<string | null>(
    null
  );
  const [restoreNotice, setRestoreNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as IntakeDraftSnapshot;
      setStep(parsed.step || 'contact');
      setCreatedContact(parsed.createdContact || null);
      setRestoredContactIdToValidate(parsed.createdContact?.contact_id || null);
    } catch {
      setStep('contact');
      setCreatedContact(null);
      setRestoredContactIdToValidate(null);
    } finally {
      setIsDraftRestored(true);
    }
  }, []);

  useEffect(() => {
    if (!isDraftRestored || !restoredContactIdToValidate) {
      return;
    }

    let cancelled = false;

    const validateRestoredContact = async () => {
      try {
        const contact = (await contactsApiClient.getContact(
          restoredContactIdToValidate
        )) as Contact;
        if (cancelled) {
          return;
        }
        setCreatedContact({
          contact_id: contact.contact_id,
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email,
        });
        setRestoreNotice(null);
      } catch {
        if (cancelled) {
          return;
        }
        setCreatedContact(null);
        setStep('contact');
        setRestoreNotice('The restored contact is no longer available. Start a new intake.');
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } finally {
        if (!cancelled) {
          setRestoredContactIdToValidate(null);
        }
      }
    };

    void validateRestoredContact();

    return () => {
      cancelled = true;
    };
  }, [isDraftRestored, restoredContactIdToValidate]);

  useEffect(() => {
    if (!isDraftRestored) {
      return;
    }

    const snapshot: IntakeDraftSnapshot = {
      step,
      createdContact,
    };

    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(snapshot));
  }, [createdContact, isDraftRestored, step]);

  const steps = useMemo<WorkflowStep<IntakeStep>[]>(
    () => [
      { key: 'contact', label: 'Create Contact' },
      { key: 'case', label: 'Create Case' },
    ],
    []
  );

  const handleContactCreated = (contact: Contact) => {
    setRestoreNotice(null);
    setRestoredContactIdToValidate(null);
    setCreatedContact({
      contact_id: contact.contact_id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
    });
    setStep('case');
  };

  const handleCaseCreated = (createdCase: CaseWithDetails) => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    navigate(`/cases/${createdCase.id}`);
  };

  const isValidatingRestoredContact = Boolean(restoredContactIdToValidate);
  const canOpenCaseStep = Boolean(createdContact?.contact_id) && !isValidatingRestoredContact;
  const showCaseStep = step === 'case' && (canOpenCaseStep || isValidatingRestoredContact);

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-app-text">New Intake</h1>
          <p className="text-app-text-muted mt-1">
            Create a new person contact file, then open a case for them.
          </p>
        </div>

        <WorkflowStepper
          steps={steps}
          currentStep={step}
          onStepClick={(nextStep) => {
            if (nextStep === 'contact') {
              setStep('contact');
              return;
            }

            if (canOpenCaseStep) {
              setStep('case');
            }
          }}
          className="mb-6"
        />

        {!showCaseStep ? (
          <div className="bg-app-surface rounded-lg shadow-sm p-6">
            {restoreNotice && (
              <div className="mb-4 rounded-lg border border-app-border bg-app-accent-soft px-4 py-3 text-sm text-app-accent-text">
                {restoreNotice}
              </div>
            )}
            <ContactForm
              mode="create"
              onCreated={handleContactCreated}
              onCancel={() => {
                sessionStorage.removeItem(SESSION_STORAGE_KEY);
                navigate('/dashboard');
              }}
            />
          </div>
        ) : (
          <div className="bg-app-surface rounded-lg shadow-sm p-6">
            {isValidatingRestoredContact ? (
              <div role="status" aria-live="polite" className="text-sm text-app-text-muted">
                Checking restored contact...
              </div>
            ) : null}
            {createdContact && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-app-border bg-app-surface-muted px-4 py-3">
                <div>
                  <div className="text-sm text-app-text-muted">Contact</div>
                  <div className="font-medium text-app-text">
                    {createdContact.first_name} {createdContact.last_name}
                  </div>
                  {createdContact.email && (
                    <div className="text-sm text-app-text-muted">{createdContact.email}</div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('contact')}
                    className="text-sm font-medium text-app-text-muted hover:text-app-text"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/contacts/${createdContact.contact_id}`)}
                    className="text-sm font-medium text-app-accent hover:text-app-accent-text"
                  >
                    View contact
                  </button>
                </div>
              </div>
            )}
            {!isValidatingRestoredContact ? (
              <CaseForm
                initialData={{ contact_id: createdContact?.contact_id || '' }}
                disableContactSelection={Boolean(createdContact)}
                onCreated={handleCaseCreated}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default IntakeNew;
