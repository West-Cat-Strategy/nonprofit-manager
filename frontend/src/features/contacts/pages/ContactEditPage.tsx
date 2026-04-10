/**
 * ContactEdit Page
 * Page for editing an existing contact with neo-brutalist styling
 */

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchContactById, clearCurrentContact } from '../state';
import { BrutalButton, BrutalCard } from '../../../components/neo-brutalist';
import { ContactForm } from '../components/contactForm';
import ContactPageShell from '../components/ContactPageShell';

export const ContactEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentContact, loading, error } = useAppSelector((state) => state.contacts);
  const contactPath = id ? `/contacts/${id}` : '/contacts';
  const handleCancel = () => navigate(contactPath, { replace: true });

  useEffect(() => {
    if (id) {
      dispatch(fetchContactById(id));
    }

    return () => {
      dispatch(clearCurrentContact());
    };
  }, [id, dispatch]);

  if (loading && !currentContact) {
    return (
      <div className="p-6">
        <BrutalCard color="white" className="p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin h-12 w-12 border-4 border-black border-t-transparent mb-4" />
            <p className="font-bold text-black">Loading contact...</p>
          </div>
        </BrutalCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <BrutalCard color="pink" className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-black uppercase text-black mb-2">Error</h2>
            <p className="font-bold text-black/70 mb-4">{error}</p>
            <BrutalButton onClick={handleCancel} variant="secondary">
              Back to People
            </BrutalButton>
          </div>
        </BrutalCard>
      </div>
    );
  }

  if (!currentContact) {
    return (
      <div className="p-6">
        <BrutalCard color="yellow" className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h2 className="text-xl font-black uppercase text-black mb-2">Contact Not Found</h2>
            <p className="font-bold text-black/70 mb-4">
              The contact you're looking for doesn't exist or has been removed.
            </p>
            <BrutalButton onClick={handleCancel} variant="primary">
              Back to People
            </BrutalButton>
          </div>
        </BrutalCard>
      </div>
    );
  }

  const fullName = `${currentContact.first_name} ${currentContact.last_name}`;

  return (
    <ContactPageShell
      tone="purple"
      backLabel="Back to Contact"
      onBack={handleCancel}
      title="Edit Contact"
      description={fullName}
      actions={(
        <BrutalButton onClick={handleCancel} variant="secondary">
          Cancel
        </BrutalButton>
      )}
    >
      <BrutalCard color="white" className="p-6">
        <ContactForm contact={currentContact} mode="edit" onCancel={handleCancel} />
      </BrutalCard>
    </ContactPageShell>
  );
};

export default ContactEdit;
