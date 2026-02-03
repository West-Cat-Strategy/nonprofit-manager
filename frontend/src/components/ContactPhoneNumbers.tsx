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
    } catch (error: any) {
      alert(error.message || 'Failed to save phone number');
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
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : phones.length === 0 && !isAdding ? (
        <div className="text-center py-6 bg-gray-50 rounded-lg">
          <div className="text-gray-400 text-2xl mb-1">📞</div>
          <p className="text-gray-500 text-sm">No phone numbers</p>
        </div>
      ) : (
        <div className="space-y-2">
          {phones.map((phone) => (
            <div
              key={phone.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                phone.is_primary ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{getLabelIcon(phone.label)}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${phone.phone_number}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {phone.phone_number}
                    </a>
                    {phone.is_primary && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 capitalize">{phone.label}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(phone)}
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
                  onClick={() => handleDelete(phone.id)}
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
          <h4 className="font-medium mb-3">{editingId ? 'Edit Phone Number' : 'Add Phone Number'}</h4>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone_number: e.target.value }))}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
              <select
                value={formData.label}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, label: e.target.value as PhoneLabel }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Set as primary phone number</span>
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
          + Add Phone Number
        </button>
      )}
    </div>
  );
};

export default ContactPhoneNumbers;
