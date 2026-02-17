/**
 * ContactEdit Page
 * Page for editing an existing contact with neo-brutalist styling
 */

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchContactById, clearCurrentContact } from '../../../store/slices/contactsSlice';
import { BrutalButton, BrutalCard } from '../../../components/neo-brutalist';
import { ContactForm } from '../../../components/contactForm';

export const ContactEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentContact, loading, error } = useAppSelector((state) => state.contacts);

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
            <BrutalButton onClick={() => navigate('/contacts')} variant="secondary">
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
            <BrutalButton onClick={() => navigate('/contacts')} variant="primary">
              Back to People
            </BrutalButton>
          </div>
        </BrutalCard>
      </div>
    );
  }

  const fullName = `${currentContact.first_name} ${currentContact.last_name}`;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <BrutalCard color="purple" className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <button
              onClick={() => navigate(`/contacts/${id}`)}
              className="text-sm font-black uppercase text-black/70 hover:text-black mb-2 flex items-center gap-1"
              aria-label="Back to contact details"
            >
              ← Back to Contact
            </button>
            <h1 className="text-3xl font-black uppercase tracking-tight text-black">
              Edit Contact
            </h1>
            <p className="mt-1 font-bold text-black/70">{fullName}</p>
          </div>
          <div className="flex gap-2">
            <BrutalButton onClick={() => navigate(`/contacts/${id}`)} variant="secondary">
              Cancel
            </BrutalButton>
          </div>
        </div>
      </BrutalCard>

      {/* Form */}
      <BrutalCard color="white" className="p-6">
        <ContactForm contact={currentContact} mode="edit" />
      </BrutalCard>
    </div>
  );
};
