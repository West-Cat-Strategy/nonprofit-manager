/**
 * ContactCreate Page
 * Page for creating a new contact with neo-brutalist styling
 */

import { useNavigate } from 'react-router-dom';
<<<<<<< HEAD
import { ContactForm } from '../components/contactForm';
import ContactPageShell from '../components/ContactPageShell';
import { BrutalButton, BrutalCard } from '../../../components/neo-brutalist';

export const ContactCreate: React.FC = () => {
  const navigate = useNavigate();
  const handleCancel = () => navigate('/contacts', { replace: true });

  return (
    <ContactPageShell
      tone="green"
      backLabel="Back to People"
      onBack={handleCancel}
      title="Create New Contact"
      description="Add a new contact to the system. Required fields are marked with an asterisk (*)."
      actions={(
        <BrutalButton onClick={handleCancel} variant="secondary">
          Cancel
        </BrutalButton>
      )}
    >
      <BrutalCard color="white" className="p-6">
        <ContactForm mode="create" onCancel={handleCancel} />
      </BrutalCard>
    </ContactPageShell>
=======
import { BrutalCard } from '../../../components/neo-brutalist';
import { ContactForm } from '../components/contactForm';

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
              className="mb-2 flex items-center gap-1 text-sm font-black uppercase text-black/70 hover:text-black dark:text-white/80 dark:hover:text-white"
              aria-label="Back to people"
            >
              ← Back to People
            </button>
            <h1 className="text-3xl font-black uppercase tracking-tight text-black dark:text-white">
              Create New Contact
            </h1>
            <p className="mt-1 font-bold text-black/70 dark:text-white/80">
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
>>>>>>> origin/main
  );
};

export default ContactCreate;
