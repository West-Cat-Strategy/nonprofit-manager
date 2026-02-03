import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ContactForm } from '../components/ContactForm';
import CaseForm from '../components/CaseForm';
import type { Contact } from '../store/slices/contactsSlice';
import type { CaseWithDetails } from '../types/case';

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
          <h1 className="text-2xl font-bold text-gray-900">New Intake</h1>
          <p className="text-gray-600 mt-1">
            Create a new person contact file, then open a case for them.
          </p>
        </div>

        <div className="mb-6 flex items-center gap-3 text-sm">
          <div
            className={`px-3 py-1 rounded-full ${
              step === 'contact' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
            }`}
          >
            1. Create Contact
          </div>
          <div className="h-px flex-1 bg-gray-200"></div>
          <div
            className={`px-3 py-1 rounded-full ${
              step === 'case' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            2. Create Case
          </div>
        </div>

        {step === 'contact' ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <ContactForm
              mode="create"
              onCreated={handleContactCreated}
              onCancel={() => navigate('/dashboard')}
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6">
            {createdContact && (
              <div className="mb-6 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div>
                  <div className="text-sm text-gray-500">Contact</div>
                  <div className="font-medium text-gray-900">
                    {createdContact.first_name} {createdContact.last_name}
                  </div>
                  {createdContact.email && (
                    <div className="text-sm text-gray-600">{createdContact.email}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/contacts/${createdContact.contact_id}`)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
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
