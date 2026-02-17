import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchContactPhones,
  createContactPhone,
  updateContactPhone,
  deleteContactPhone,
} from '../store/slices/contactsSlice';
import type { CreateContactPhoneDTO, PhoneLabel } from '../types/contact';
import { PHONE_LABELS } from '../types/contact';

interface ContactPhoneNumbersProps {
  contactId: string;
}

const ContactPhoneNumbers = ({ contactId }: ContactPhoneNumbersProps) => {
  const dispatch = useAppDispatch();
  const { phones, phonesLoading } = useAppSelector((state) => state.contacts);
  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateContactPhoneDTO>({
    phone_number: '',
    label: 'mobile',
    is_primary: false,
  });

  useEffect(() => {
    dispatch(fetchContactPhones(contactId));
  }, [dispatch, contactId]);

  const resetForm = () => {
    setFormData({ phone_number: '', label: 'mobile', is_primary: false });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.phone_number.trim()) {
      alert('Please enter a phone number');
      return;
    }

    try {
      if (editingId) {
        await dispatch(updateContactPhone({ phoneId: editingId, data: formData })).unwrap();
      } else {
        await dispatch(createContactPhone({ contactId, data: formData })).unwrap();
      }
      resetForm();
    } catch (error) {
      alert(getErrorMessage(error, 'Failed to save phone number'));
    }
  };

  const handleEdit = (phone: typeof phones[0]) => {
    setFormData({
      phone_number: phone.phone_number,
      label: phone.label,
      is_primary: phone.is_primary,
    });
    setEditingId(phone.id);
    setIsAdding(true);
  };

  const handleDelete = async (phoneId: string) => {
    if (!confirm('Are you sure you want to delete this phone number?')) return;

    try {
      await dispatch(deleteContactPhone(phoneId)).unwrap();
    } catch (error) {
      console.error('Failed to delete phone:', error);
    }
  };

  const getLabelIcon = (label: PhoneLabel) => {
    const icons: Record<PhoneLabel, string> = {
      mobile: '📱',
      home: '🏠',
      work: '💼',
      fax: '📠',
      other: '📞',
    };
    return icons[label] || '📞';
  };

  return (
    <div className="space-y-4">
      {/* Phone List */}
      {phonesLoading && phones.length === 0 ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-app-accent mx-auto"></div>
        </div>
      ) : phones.length === 0 && !isAdding ? (
        <div className="text-center py-6 bg-app-surface-muted rounded-lg">
          <div className="text-app-text-subtle text-2xl mb-1">📞</div>
          <p className="text-app-text-muted text-sm">No phone numbers</p>
        </div>
      ) : (
        <div className="space-y-2">
          {phones.map((phone) => (
            <div
              key={phone.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                phone.is_primary ? 'bg-app-accent-soft border-app-accent-soft' : 'bg-app-surface border-app-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{getLabelIcon(phone.label)}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${phone.phone_number}`}
                      className="font-medium text-app-text hover:text-app-accent"
                    >
                      {phone.phone_number}
                    </a>
                    {phone.is_primary && (
                      <span className="px-2 py-0.5 text-xs bg-app-accent-soft text-app-accent-text rounded">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-app-text-muted capitalize">{phone.label}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(phone)}
                  className="p-1 text-app-text-subtle hover:text-app-accent transition"
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
                  onClick={() => handleDelete(phone.id)}
                  className="p-1 text-app-text-subtle hover:text-red-500 transition"
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
        <form onSubmit={handleSubmit} className="bg-app-surface-muted rounded-lg p-4 border border-app-border">
          <h4 className="font-medium mb-3">{editingId ? 'Edit Phone Number' : 'Add Phone Number'}</h4>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone_number: e.target.value }))}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">Label</label>
              <select
                value={formData.label}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, label: e.target.value as PhoneLabel }))
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
              >
                {PHONE_LABELS.map((label) => (
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
              className="rounded border-app-input-border text-app-accent focus:ring-app-accent"
            />
            <span className="text-sm text-app-text-muted">Set as primary phone number</span>
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1.5 text-sm border border-app-input-border rounded-lg hover:bg-app-surface-muted transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-sm bg-app-accent text-white rounded-lg hover:bg-app-accent-hover transition"
            >
              {editingId ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full px-3 py-2 text-sm text-app-accent border border-dashed border-app-accent rounded-lg hover:bg-app-accent-soft transition"
        >
          + Add Phone Number
        </button>
      )}
    </div>
  );
};

export default ContactPhoneNumbers;
