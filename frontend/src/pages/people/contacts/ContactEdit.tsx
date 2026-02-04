import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchContactById, clearCurrentContact } from '../../../store/slices/contactsSlice';
import { ContactForm } from '../../../components/ContactForm';

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error loading contact: {error}
        </div>
        <button
          onClick={() => navigate('/contacts')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          ← Back to Contacts
        </button>
      </div>
    );
  }

  if (!currentContact) {
    return (
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          Contact not found
        </div>
        <button
          onClick={() => navigate('/contacts')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          ← Back to Contacts
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Contact</h1>
        <p className="mt-1 text-sm text-gray-600">
          Update contact information. Required fields are marked with an asterisk (*).
        </p>
      </div>
      <ContactForm contact={currentContact} mode="edit" />
    </div>
  );
};
