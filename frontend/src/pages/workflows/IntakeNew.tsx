import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CaseForm from '../../components/CaseForm';
import { ContactForm } from '../../components/contactForm';
import type { CaseWithDetails } from '../../types/case';
import type { Contact } from '../../features/contacts/state';
import WorkflowStepper, { type WorkflowStep } from '../../features/workflows/components/WorkflowStepper';

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

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as IntakeDraftSnapshot;
      setStep(parsed.step || 'contact');
      setCreatedContact(parsed.createdContact || null);
    } catch {
      setStep('contact');
      setCreatedContact(null);
    } finally {
      setIsDraftRestored(true);
    }
  }, []);

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

  const canOpenCaseStep = Boolean(createdContact?.contact_id);

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

        {step === 'contact' ? (
          <div className="bg-app-surface rounded-lg shadow-sm p-6">
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
            <CaseForm
              initialData={{ contact_id: createdContact?.contact_id || '' }}
              disableContactSelection={Boolean(createdContact)}
              onCreated={handleCaseCreated}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default IntakeNew;
