/**
 * ContactCreate Page
 * Page for creating a new contact with neo-brutalist styling
 */

import { useNavigate } from 'react-router-dom';
import { BrutalCard } from '../../../components/neo-brutalist';
import { ContactForm } from '../../../components/ContactForm';

export const ContactCreate: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <BrutalCard color="green" className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <button
              onClick={() => navigate('/contacts')}
              className="text-sm font-black uppercase text-black/70 hover:text-black mb-2 flex items-center gap-1"
              aria-label="Back to people"
            >
              ← Back to People
            </button>
            <h1 className="text-3xl font-black uppercase tracking-tight text-black">
              Create New Contact
            </h1>
            <p className="mt-1 font-bold text-black/70">
              Add a new contact to the system. Required fields are marked with an asterisk (*).
            </p>
          </div>
        </div>
      </BrutalCard>

      {/* Form */}
      <BrutalCard color="white" className="p-6">
        <ContactForm mode="create" />
      </BrutalCard>
    </div>
  );
};
