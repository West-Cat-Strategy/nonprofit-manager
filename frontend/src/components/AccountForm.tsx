import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import { createAccount, updateAccount } from '../store/slices/accountsSlice';
import type { Account } from '../store/slices/accountsSlice';
import { useForm, formValidators, type ValidationRules } from '../hooks/useForm';
import { validateEmail, validatePhoneNumber, validateUrl } from '../utils/validation';

type AccountFormValues = {
  account_id?: string;
  account_number?: string;
  account_name: string;
  account_type: Account['account_type'];
  category: Account['category'];
  email: string;
  phone: string;
  website: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  tax_id: string;
  description: string;
  is_active: boolean;
};

const initialValues: AccountFormValues = {
  account_name: '',
  account_type: 'individual',
  category: 'donor',
  email: '',
  phone: '',
  website: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state_province: '',
  postal_code: '',
  country: '',
  tax_id: '',
  description: '',
  is_active: true,
};

const validationRules: ValidationRules<AccountFormValues> = {
  account_name: formValidators.required('Account name'),
  email: (value) => validateEmail(value),
  phone: (value) => validatePhoneNumber(value),
  website: (value) => {
    if (!value) return null;
    // Use stricter URL validation that requires protocol
    if (!/^https?:\/\/.+/.test(value)) {
      return 'Website must start with http:// or https://';
    }
    return validateUrl(value);
  },
};

interface AccountFormProps {
  account?: Account;
  mode: 'create' | 'edit';
}

export const AccountForm: React.FC<AccountFormProps> = ({ account, mode }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const {
    values,
    errors,
    isSubmitting,
    handleChange,
    validate,
    setError,
    resetTo,
  } = useForm<AccountFormValues>({
    initialValues,
    validationRules,
  });

  useEffect(() => {
    if (account && mode === 'edit') {
      resetTo({
        ...initialValues,
        ...account,
        email: account.email ?? '',
        phone: account.phone ?? '',
        website: account.website ?? '',
        address_line1: account.address_line1 ?? '',
        address_line2: account.address_line2 ?? '',
        city: account.city ?? '',
        state_province: account.state_province ?? '',
        postal_code: account.postal_code ?? '',
        country: account.country ?? '',
        tax_id: account.tax_id ?? '',
        description: account.description ?? '',
        is_active: account.is_active ?? true,
      });
    }
  }, [account, mode, resetTo]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      if (mode === 'create') {
        await dispatch(createAccount(values)).unwrap();
        navigate('/accounts');
      } else if (mode === 'edit' && account?.account_id) {
        await dispatch(
          updateAccount({
            accountId: account.account_id,
            data: values,
          })
        ).unwrap();
        navigate(`/accounts/${account.account_id}`);
      }
    } catch (error) {
      console.error('Failed to save account:', error);
      setError('submit', 'Failed to save account. Please try again.');
    }
  };

  const handleCancel = () => {
    if (mode === 'edit' && account?.account_id) {
      navigate(`/accounts/${account.account_id}`);
    } else {
      navigate('/accounts');
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {errors.submit}
        </div>
      )}

      {/* Basic Information */}
      <div className="bg-app-surface shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-app-text-heading mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="account_name" className="block text-sm font-medium text-app-text-label">
              Account Name *
            </label>
            <input
              type="text"
              name="account_name"
              id="account_name"
              value={values.account_name}
              onChange={handleChange}
              className={`mt-1 block w-full border ${
                errors.account_name ? 'border-red-300' : 'border-app-input-border'
              } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm`}
            />
            {errors.account_name && (
              <p className="mt-1 text-sm text-red-600">{errors.account_name}</p>
            )}
          </div>

          <div>
            <label htmlFor="account_type" className="block text-sm font-medium text-app-text-label">
              Account Type *
            </label>
            <select
              name="account_type"
              id="account_type"
              value={values.account_type}
              onChange={handleChange}
              className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
            >
              <option value="individual">Individual</option>
              <option value="organization">Organization</option>
            </select>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-app-text-label">
              Category *
            </label>
            <select
              name="category"
              id="category"
              value={values.category}
              onChange={handleChange}
              className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
            >
              <option value="donor">Donor</option>
              <option value="volunteer">Volunteer</option>
              <option value="partner">Partner</option>
              <option value="vendor">Vendor</option>
              <option value="beneficiary">Beneficiary</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-app-surface shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-app-text-heading mb-4">Contact Information</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-app-text-label">
              Email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={values.email}
              onChange={handleChange}
              className={`mt-1 block w-full border ${
                errors.email ? 'border-red-300' : 'border-app-input-border'
              } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm`}
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-app-text-label">
              Phone
            </label>
            <input
              type="text"
              name="phone"
              id="phone"
              value={values.phone}
              onChange={handleChange}
              className={`mt-1 block w-full border ${
                errors.phone ? 'border-red-300' : 'border-app-input-border'
              } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm`}
            />
            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="website" className="block text-sm font-medium text-app-text-label">
              Website
            </label>
            <input
              type="text"
              name="website"
              id="website"
              value={values.website}
              onChange={handleChange}
              placeholder="https://example.com"
              className={`mt-1 block w-full border ${
                errors.website ? 'border-red-300' : 'border-app-input-border'
              } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm`}
            />
            {errors.website && <p className="mt-1 text-sm text-red-600">{errors.website}</p>}
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="bg-app-surface shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-app-text-heading mb-4">Address</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="address_line1" className="block text-sm font-medium text-app-text-label">
              Address Line 1
            </label>
            <input
              type="text"
              name="address_line1"
              id="address_line1"
              value={values.address_line1}
              onChange={handleChange}
              className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="address_line2" className="block text-sm font-medium text-app-text-label">
              Address Line 2
            </label>
            <input
              type="text"
              name="address_line2"
              id="address_line2"
              value={values.address_line2}
              onChange={handleChange}
              className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-app-text-label">
              City
            </label>
            <input
              type="text"
              name="city"
              id="city"
              value={values.city}
              onChange={handleChange}
              className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="state_province" className="block text-sm font-medium text-app-text-label">
              State/Province
            </label>
            <input
              type="text"
              name="state_province"
              id="state_province"
              value={values.state_province}
              onChange={handleChange}
              className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="postal_code" className="block text-sm font-medium text-app-text-label">
              Postal Code
            </label>
            <input
              type="text"
              name="postal_code"
              id="postal_code"
              value={values.postal_code}
              onChange={handleChange}
              className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-app-text-label">
              Country
            </label>
            <input
              type="text"
              name="country"
              id="country"
              value={values.country}
              onChange={handleChange}
              className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-app-surface shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-app-text-heading mb-4">Additional Information</h2>
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label htmlFor="tax_id" className="block text-sm font-medium text-app-text-label">
              Tax ID / EIN
            </label>
            <input
              type="text"
              name="tax_id"
              id="tax_id"
              value={values.tax_id}
              onChange={handleChange}
              className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-app-text-label">
              Description
            </label>
            <textarea
              name="description"
              id="description"
              rows={3}
              value={values.description}
              onChange={handleChange}
              className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
            />
          </div>

          {mode === 'edit' && (
            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                id="is_active"
                checked={values.is_active}
                onChange={handleChange}
                className="h-4 w-4 text-app-accent focus:ring-app-accent border-app-input-border rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-app-text">
                Active Account
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={handleCancel}
          className="bg-app-surface py-2 px-4 border border-app-border rounded-md shadow-sm text-sm font-medium text-app-text-label hover:bg-app-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-app-accent"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-app-accent py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-app-accent disabled:bg-app-text-subtle disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Account' : 'Update Account'}
        </button>
      </div>
    </form>
  );
};
