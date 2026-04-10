/**
 * ContactCreate Page
 * Page for creating a new contact with neo-brutalist styling
 */

import { useNavigate } from 'react-router-dom';
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
  );
};

export default ContactCreate;
