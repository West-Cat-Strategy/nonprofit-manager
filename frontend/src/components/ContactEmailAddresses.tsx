import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchContactEmails,
  createContactEmail,
  updateContactEmail,
  deleteContactEmail,
} from '../store/slices/contactsSlice';
import type { CreateContactEmailDTO, EmailLabel } from '../types/contact';
import { EMAIL_LABELS } from '../types/contact';

interface ContactEmailAddressesProps {
  contactId: string;
}

const ContactEmailAddresses = ({ contactId }: ContactEmailAddressesProps) => {
  const dispatch = useAppDispatch();
  const { emails, emailsLoading } = useAppSelector((state) => state.contacts);
  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateContactEmailDTO>({
    email_address: '',
    label: 'personal',
    is_primary: false,
  });

  useEffect(() => {
    dispatch(fetchContactEmails(contactId));
  }, [dispatch, contactId]);

  const resetForm = () => {
    setFormData({ email_address: '', label: 'personal', is_primary: false });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email_address.trim()) {
      alert('Please enter an email address');
      return;
    }

    try {
      if (editingId) {
        await dispatch(updateContactEmail({ emailId: editingId, data: formData })).unwrap();
      } else {
        await dispatch(createContactEmail({ contactId, data: formData })).unwrap();
      }
      resetForm();
    } catch (error) {
      alert(getErrorMessage(error, 'Failed to save email address'));
    }
  };

  const handleEdit = (email: typeof emails[0]) => {
    setFormData({
      email_address: email.email_address,
      label: email.label,
      is_primary: email.is_primary,
    });
    setEditingId(email.id);
    setIsAdding(true);
  };

  const handleDelete = async (emailId: string) => {
    if (!confirm('Are you sure you want to delete this email address?')) return;

    try {
      await dispatch(deleteContactEmail(emailId)).unwrap();
    } catch (error) {
      console.error('Failed to delete email:', error);
    }
  };

  const getLabelIcon = (label: EmailLabel) => {
    const icons: Record<EmailLabel, string> = {
      personal: '👤',
      work: '💼',
      other: '📧',
    };
    return icons[label] || '📧';
  };

  return (
    <div className="space-y-4">
      {/* Email List */}
      {emailsLoading && emails.length === 0 ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : emails.length === 0 && !isAdding ? (
        <div className="text-center py-6 bg-gray-50 rounded-lg">
          <div className="text-gray-400 text-2xl mb-1">📧</div>
          <p className="text-gray-500 text-sm">No email addresses</p>
        </div>
      ) : (
        <div className="space-y-2">
          {emails.map((email) => (
            <div
              key={email.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                email.is_primary ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{getLabelIcon(email.label)}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`mailto:${email.email_address}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {email.email_address}
                    </a>
                    {email.is_primary && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 capitalize">{email.label}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(email)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(email.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      {isAdding ? (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="font-medium mb-3">
            {editingId ? 'Edit Email Address' : 'Add Email Address'}
          </h4>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email_address}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email_address: e.target.value }))
                }
                placeholder="email@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
              <select
                value={formData.label}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, label: e.target.value as EmailLabel }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {EMAIL_LABELS.map((label) => (
                  <option key={label.value} value={label.value}>
                    {label.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              checked={formData.is_primary}
              onChange={(e) => setFormData((prev) => ({ ...prev, is_primary: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Set as primary email address</span>
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {editingId ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full px-3 py-2 text-sm text-blue-600 border border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition"
        >
          + Add Email Address
        </button>
      )}
    </div>
  );
};

export default ContactEmailAddresses;
