import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ContactForm } from '../../components/contactForm';
import CaseForm from '../../components/CaseForm';
import type { Contact } from '../../features/contacts/state';
import type { CaseWithDetails } from '../../types/case';

const IntakeNew = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'contact' | 'case'>('contact');
  const [createdContact, setCreatedContact] = useState<Contact | null>(null);

  const handleContactCreated = (contact: Contact) => {
    setCreatedContact(contact);
    setStep('case');
  };

  const handleCaseCreated = (createdCase: CaseWithDetails) => {
    navigate(`/cases/${createdCase.id}`);
  };

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-app-text">New Intake</h1>
          <p className="text-app-text-muted mt-1">
            Create a new person contact file, then open a case for them.
          </p>
        </div>

        <div className="mb-6 flex items-center gap-3 text-sm">
          <div
            className={`px-3 py-1 rounded-full ${
              step === 'contact' ? 'bg-app-accent text-white' : 'bg-app-accent-soft text-app-accent'
            }`}
          >
            1. Create Contact
          </div>
          <div className="h-px flex-1 bg-app-surface-muted"></div>
          <div
            className={`px-3 py-1 rounded-full ${
              step === 'case' ? 'bg-app-accent text-white' : 'bg-app-surface-muted text-app-text-muted'
            }`}
          >
            2. Create Case
          </div>
        </div>

        {step === 'contact' ? (
          <div className="bg-app-surface rounded-lg shadow-sm p-6">
            <ContactForm
              mode="create"
              onCreated={handleContactCreated}
              onCancel={() => navigate('/dashboard')}
            />
          </div>
        ) : (
          <div className="bg-app-surface rounded-lg shadow-sm p-6">
            {createdContact && (
              <div className="mb-6 flex items-center justify-between rounded-lg border border-app-border bg-app-surface-muted px-4 py-3">
                <div>
                  <div className="text-sm text-app-text-muted">Contact</div>
                  <div className="font-medium text-app-text">
                    {createdContact.first_name} {createdContact.last_name}
                  </div>
                  {createdContact.email && (
                    <div className="text-sm text-app-text-muted">{createdContact.email}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/contacts/${createdContact.contact_id}`)}
                  className="text-sm font-medium text-app-accent hover:text-app-accent-text"
                >
                  View contact
                </button>
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
