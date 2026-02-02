import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createContact, updateContact } from '../store/slices/contactsSlice';
import { fetchAccounts } from '../store/slices/accountsSlice';
import type { Contact as StoreContact } from '../store/slices/contactsSlice';

type ContactFormValues = {
  contact_id?: string;
  account_id?: string | null;
  contact_role: StoreContact['contact_role'];
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  salutation?: string | null;
  suffix?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile_phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  country?: string | null;
  job_title?: string | null;
  department?: string | null;
  preferred_contact_method?: string | null;
  do_not_email?: boolean;
  do_not_phone?: boolean;
  notes?: string | null;
  is_active?: boolean;
};

interface ContactFormProps {
  contact?: StoreContact;
  mode: 'create' | 'edit';
}

export const ContactForm: React.FC<ContactFormProps> = ({ contact, mode }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { accounts } = useAppSelector((state) => state.accounts);

  const [formData, setFormData] = useState<ContactFormValues>({
    account_id: '',
    contact_role: 'general',
    first_name: '',
    last_name: '',
    middle_name: '',
    salutation: '',
    suffix: '',
    email: '',
    phone: '',
    mobile_phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: '',
    job_title: '',
    department: '',
    preferred_contact_method: 'email',
    do_not_email: false,
    do_not_phone: false,
    notes: '',
    is_active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Load accounts for the dropdown
    dispatch(fetchAccounts({ page: 1, limit: 1000 }));
  }, [dispatch]);

  useEffect(() => {
    if (contact && mode === 'edit') {
      setFormData({
        ...contact,
      });
    }
  }, [contact, mode]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.phone && !/^[\d\s+() -]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    if (formData.mobile_phone && !/^[\d\s+() -]+$/.test(formData.mobile_phone)) {
      newErrors.mobile_phone = 'Invalid mobile phone number format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Clean up the data - remove empty strings and convert to undefined for optional fields
      const cleanedData = {
        ...formData,
        account_id: formData.account_id || undefined,
        middle_name: formData.middle_name || undefined,
        salutation: formData.salutation || undefined,
        suffix: formData.suffix || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        mobile_phone: formData.mobile_phone || undefined,
        address_line1: formData.address_line1 || undefined,
        address_line2: formData.address_line2 || undefined,
        city: formData.city || undefined,
        state_province: formData.state_province || undefined,
        postal_code: formData.postal_code || undefined,
        country: formData.country || undefined,
        job_title: formData.job_title || undefined,
        department: formData.department || undefined,
        preferred_contact_method: formData.preferred_contact_method || undefined,
        notes: formData.notes || undefined,
      };

      if (mode === 'create') {
        await dispatch(createContact(cleanedData)).unwrap();
        navigate('/contacts');
      } else if (mode === 'edit' && contact?.contact_id) {
        await dispatch(
          updateContact({
            contactId: contact.contact_id,
            data: cleanedData,
          })
        ).unwrap();
        navigate(`/contacts/${contact.contact_id}`);
      }
    } catch (error) {
      console.error('Failed to save contact:', error);
      setErrors({ submit: 'Failed to save contact. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (mode === 'edit' && contact?.contact_id) {
      navigate(`/contacts/${contact.contact_id}`);
    } else {
      navigate('/contacts');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {errors.submit}
        </div>
      )}

      {/* Account Association */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Account Association</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="account_id" className="block text-sm font-medium text-gray-700">
              Associated Account
            </label>
            <select
              name="account_id"
              id="account_id"
              value={formData.account_id ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">No Account</option>
              {accounts.map((account) => (
                <option key={account.account_id} value={account.account_id}>
                  {account.account_name} ({account.account_number})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="contact_role" className="block text-sm font-medium text-gray-700">
              Contact Role
            </label>
            <select
              name="contact_role"
              id="contact_role"
              value={formData.contact_role}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="general">General</option>
              <option value="primary">Primary</option>
              <option value="billing">Billing</option>
              <option value="technical">Technical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="salutation" className="block text-sm font-medium text-gray-700">
              Salutation
            </label>
            <input
              type="text"
              name="salutation"
              id="salutation"
              placeholder="Mr., Ms., Dr., etc."
              value={formData.salutation ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div></div>

          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
              First Name *
            </label>
            <input
              type="text"
              name="first_name"
              id="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className={`mt-1 block w-full border ${
                errors.first_name ? 'border-red-300' : 'border-gray-300'
              } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
            />
            {errors.first_name && <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>}
          </div>

          <div>
            <label htmlFor="middle_name" className="block text-sm font-medium text-gray-700">
              Middle Name
            </label>
            <input
              type="text"
              name="middle_name"
              id="middle_name"
              value={formData.middle_name ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
              Last Name *
            </label>
            <input
              type="text"
              name="last_name"
              id="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className={`mt-1 block w-full border ${
                errors.last_name ? 'border-red-300' : 'border-gray-300'
              } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
            />
            {errors.last_name && <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>}
          </div>

          <div>
            <label htmlFor="suffix" className="block text-sm font-medium text-gray-700">
              Suffix
            </label>
            <input
              type="text"
              name="suffix"
              id="suffix"
              placeholder="Jr., Sr., III, etc."
              value={formData.suffix ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="job_title" className="block text-sm font-medium text-gray-700">
              Job Title
            </label>
            <input
              type="text"
              name="job_title"
              id="job_title"
              value={formData.job_title ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700">
              Department
            </label>
            <input
              type="text"
              name="department"
              id="department"
              value={formData.department ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email ?? ''}
              onChange={handleChange}
              className={`mt-1 block w-full border ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label
              htmlFor="preferred_contact_method"
              className="block text-sm font-medium text-gray-700"
            >
              Preferred Contact Method
            </label>
            <select
              name="preferred_contact_method"
              id="preferred_contact_method"
              value={formData.preferred_contact_method ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="mobile">Mobile</option>
              <option value="mail">Mail</option>
            </select>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone
            </label>
            <input
              type="text"
              name="phone"
              id="phone"
              value={formData.phone ?? ''}
              onChange={handleChange}
              className={`mt-1 block w-full border ${
                errors.phone ? 'border-red-300' : 'border-gray-300'
              } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
            />
            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
          </div>

          <div>
            <label htmlFor="mobile_phone" className="block text-sm font-medium text-gray-700">
              Mobile Phone
            </label>
            <input
              type="text"
              name="mobile_phone"
              id="mobile_phone"
              value={formData.mobile_phone ?? ''}
              onChange={handleChange}
              className={`mt-1 block w-full border ${
                errors.mobile_phone ? 'border-red-300' : 'border-gray-300'
              } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
            />
            {errors.mobile_phone && (
              <p className="mt-1 text-sm text-red-600">{errors.mobile_phone}</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="do_not_email"
                  id="do_not_email"
                  checked={formData.do_not_email}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="do_not_email" className="ml-2 block text-sm text-gray-900">
                  Do Not Email
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="do_not_phone"
                  id="do_not_phone"
                  checked={formData.do_not_phone}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="do_not_phone" className="ml-2 block text-sm text-gray-900">
                  Do Not Phone
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Address</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="address_line1" className="block text-sm font-medium text-gray-700">
              Address Line 1
            </label>
            <input
              type="text"
              name="address_line1"
              id="address_line1"
              value={formData.address_line1 ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="address_line2" className="block text-sm font-medium text-gray-700">
              Address Line 2
            </label>
            <input
              type="text"
              name="address_line2"
              id="address_line2"
              value={formData.address_line2 ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700">
              City
            </label>
            <input
              type="text"
              name="city"
              id="city"
              value={formData.city ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="state_province" className="block text-sm font-medium text-gray-700">
              State/Province
            </label>
            <input
              type="text"
              name="state_province"
              id="state_province"
              value={formData.state_province ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700">
              Postal Code
            </label>
            <input
              type="text"
              name="postal_code"
              id="postal_code"
              value={formData.postal_code ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700">
              Country
            </label>
            <input
              type="text"
              name="country"
              id="country"
              value={formData.country ?? ''}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Additional Notes</h2>
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            name="notes"
            id="notes"
            rows={4}
            value={formData.notes ?? ''}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        {mode === 'edit' && (
          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              name="is_active"
              id="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
              Active Contact
            </label>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={handleCancel}
          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Contact' : 'Update Contact'}
        </button>
      </div>
    </form>
  );
};
