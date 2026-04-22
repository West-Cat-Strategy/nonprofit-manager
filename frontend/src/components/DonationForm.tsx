/**
 * DonationForm Component
 * Reusable form for creating and editing donations
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Donation, CreateDonationDTO, UpdateDonationDTO } from '../types/donation';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import { fetchAccounts } from '../features/accounts/state';
import { fetchContacts } from '../features/contacts/state';
import type { Account } from '../features/accounts/types/contracts';
import type { Contact } from '../types/contact';
import { useAppDispatch, useAppSelector } from '../store/hooks';

interface DonationFormProps {
  donation?: Donation | null;
  onSubmit: (donationData: CreateDonationDTO | UpdateDonationDTO) => Promise<void>;
  isEdit?: boolean;
}

const donationFieldClassName =
  'app-focus-ring w-full rounded-md border border-app-input-border bg-app-input-bg px-4 py-2 text-app-text placeholder:text-app-text-subtle focus:outline-none';
const checkboxClassName = 'app-focus-ring h-4 w-4 rounded border-app-input-border text-app-accent';
const secondaryButtonClassName =
  'app-focus-ring rounded-md border border-app-input-border px-6 py-2 text-app-text hover:bg-app-surface-muted focus:outline-none';
const primaryButtonClassName =
  'app-focus-ring rounded-md bg-app-accent px-6 py-2 text-[var(--app-accent-foreground)] hover:bg-app-accent-hover focus:outline-none disabled:opacity-50';

const normalizeDateTimeLikeString = (value: string): string =>
  value.replace(
    /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}(?:\.\d+)?)(Z|[+-]\d{2}:\d{2}|[+-]\d{4}|[+-]\d{2})?$/,
    (_match, datePart: string, timePart: string, offset: string | undefined) => {
      if (!offset) {
        return `${datePart}T${timePart}`;
      }

      if (/^[+-]\d{2}$/.test(offset)) {
        return `${datePart}T${timePart}${offset}:00`;
      }

      if (/^[+-]\d{4}$/.test(offset)) {
        return `${datePart}T${timePart}${offset.slice(0, 3)}:${offset.slice(3)}`;
      }

      return `${datePart}T${timePart}${offset}`;
    }
  );

const toDateTimeLocalValue = (value: unknown): string => {
  if (!value) {
    return '';
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 16);
  }

  if (typeof value === 'number') {
    const parsedNumberDate = new Date(value);
    return Number.isNaN(parsedNumberDate.getTime())
      ? ''
      : parsedNumberDate.toISOString().slice(0, 16);
  }

  if (typeof value !== 'string') {
    const dateLikeValue = value as {
      toISOString?: () => string;
      toISO?: () => string;
      valueOf?: () => unknown;
      toString?: () => string;
      value?: unknown;
      date?: unknown;
    };

    if (typeof dateLikeValue.toISOString === 'function') {
      return toDateTimeLocalValue(dateLikeValue.toISOString());
    }

    if (typeof dateLikeValue.toISO === 'function') {
      return toDateTimeLocalValue(dateLikeValue.toISO());
    }

    if ('value' in dateLikeValue) {
      const resolvedValue = toDateTimeLocalValue(dateLikeValue.value);
      if (resolvedValue) {
        return resolvedValue;
      }
    }

    if ('date' in dateLikeValue) {
      const resolvedDate = toDateTimeLocalValue(dateLikeValue.date);
      if (resolvedDate) {
        return resolvedDate;
      }
    }

    if (typeof dateLikeValue.valueOf === 'function') {
      const rawValue = dateLikeValue.valueOf();
      if (rawValue !== value) {
        const resolvedFromValueOf = toDateTimeLocalValue(rawValue);
        if (resolvedFromValueOf) {
          return resolvedFromValueOf;
        }
      }
    }

    if (typeof dateLikeValue.toString === 'function') {
      const stringValue = dateLikeValue.toString();
      if (stringValue && stringValue !== '[object Object]') {
        return toDateTimeLocalValue(stringValue);
      }
    }

    return '';
  }

  const normalizedValue = normalizeDateTimeLikeString(value.trim());

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalizedValue)) {
    return normalizedValue;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(normalizedValue)) {
    return normalizedValue.slice(0, 16);
  }

  const parsed = new Date(normalizedValue);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 16);
};

const formatAccountOptionLabel = (account: Account): string => {
  const segments = [account.account_name];

  if (account.category) {
    segments.push(account.category);
  }

  if (account.email) {
    segments.push(account.email);
  }

  return segments.join(' • ');
};

const formatContactOptionLabel = (contact: Contact): string => {
  const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unnamed contact';
  const segments = [name];

  if (contact.account_name) {
    segments.push(contact.account_name);
  }

  if (contact.email) {
    segments.push(contact.email);
  }

  return segments.join(' • ');
};

const DonationForm: React.FC<DonationFormProps> = ({ donation, onSubmit, isEdit = false }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { accounts, loading: accountsLoading } = useAppSelector((state) => state.accounts.list);
  const { contacts, loading: contactsLoading } = useAppSelector((state) => state.contacts.list);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const [formData, setFormData] = useState<CreateDonationDTO | UpdateDonationDTO>({
    amount: 0,
    currency: 'CAD',
    donation_date: new Date().toISOString().substring(0, 16),
    payment_method: 'cash' as const,
    payment_status: 'pending' as const,
    is_recurring: false,
    recurring_frequency: 'one_time' as const,
  });

  useEffect(() => {
    if (donation) {
      const parsedAmount =
        typeof donation.amount === 'number' ? donation.amount : parseFloat(String(donation.amount));

      setFormData({
        account_id: donation.account_id || undefined,
        contact_id: donation.contact_id || undefined,
        amount: Number.isFinite(parsedAmount) ? parsedAmount : 0,
        currency: donation.currency,
        donation_date: toDateTimeLocalValue(donation.donation_date),
        payment_method: donation.payment_method || undefined,
        payment_status: donation.payment_status,
        transaction_id: donation.transaction_id || undefined,
        campaign_name: donation.campaign_name || undefined,
        designation: donation.designation || undefined,
        is_recurring: donation.is_recurring,
        recurring_frequency: donation.recurring_frequency || undefined,
        notes: donation.notes || undefined,
      });
      setIsDirty(false);
    }
  }, [donation]);

  useEffect(() => {
    if (accounts.length === 0 && !accountsLoading) {
      void dispatch(
        fetchAccounts({
          page: 1,
          limit: 100,
          is_active: true,
        })
      );
    }

    if (contacts.length === 0 && !contactsLoading) {
      void dispatch(
        fetchContacts({
          page: 1,
          limit: 100,
          isActive: true,
        })
      );
    }
  }, [accounts.length, accountsLoading, contacts.length, contactsLoading, dispatch]);

  useUnsavedChangesGuard({
    hasUnsavedChanges: isDirty && !loading,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setIsDirty(true);

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));
    } else if (name === 'amount') {
      setFormData((prev) => ({
        ...prev,
        [name]: parseFloat(value) || 0,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value === '' ? undefined : value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const amount = formData.amount ?? 0;
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      if (!formData.account_id && !formData.contact_id) {
        throw new Error('Select an account or contact before recording the donation');
      }

      await onSubmit(formData);
      setIsDirty(false);
      navigate('/donations');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save donation');
    } finally {
      setLoading(false);
    }
  };

  const sortedAccounts = [...accounts].sort((left, right) =>
    left.account_name.localeCompare(right.account_name)
  );
  const sortedContacts = [...contacts].sort((left, right) => {
    const leftName = `${left.first_name || ''} ${left.last_name || ''}`.trim();
    const rightName = `${right.first_name || ''} ${right.last_name || ''}`.trim();
    return leftName.localeCompare(rightName);
  });
  const selectedAccountMissing =
    Boolean(formData.account_id) &&
    !sortedAccounts.some((account) => account.account_id === formData.account_id);
  const selectedContactMissing =
    Boolean(formData.contact_id) &&
    !sortedContacts.some((contact) => contact.contact_id === formData.contact_id);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-app-surface shadow-md rounded-lg p-6">
      {error && <div className="p-4 bg-app-accent-soft text-app-accent-text rounded-md">{error}</div>}

      <div>
        <h3 className="text-lg font-semibold mb-4">Donor Linkage</h3>
        <p className="mb-4 text-sm text-app-text-muted">
          Link each manual donation to an account, a contact, or both so donor reporting stays accurate.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="account_id" className="block text-sm font-medium mb-1">
              Linked Account
            </label>
            <select
              id="account_id"
              name="account_id"
              value={formData.account_id || ''}
              onChange={handleChange}
              className={donationFieldClassName}
            >
              <option value="">No linked account</option>
              {selectedAccountMissing ? (
                <option value={formData.account_id}>
                  {donation?.account_name || `Current account (${formData.account_id})`}
                </option>
              ) : null}
              {sortedAccounts.map((account) => (
                <option key={account.account_id} value={account.account_id}>
                  {formatAccountOptionLabel(account)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-app-text-subtle">
              {accountsLoading ? 'Loading donor accounts...' : 'Optional when a contact is linked.'}
            </p>
          </div>

          <div>
            <label htmlFor="contact_id" className="block text-sm font-medium mb-1">
              Linked Contact
            </label>
            <select
              id="contact_id"
              name="contact_id"
              value={formData.contact_id || ''}
              onChange={handleChange}
              className={donationFieldClassName}
            >
              <option value="">No linked contact</option>
              {selectedContactMissing ? (
                <option value={formData.contact_id}>
                  {donation?.contact_name || `Current contact (${formData.contact_id})`}
                </option>
              ) : null}
              {sortedContacts.map((contact) => (
                <option key={contact.contact_id} value={contact.contact_id}>
                  {formatContactOptionLabel(contact)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-app-text-subtle">
              {contactsLoading ? 'Loading donor contacts...' : 'Optional when an account is linked.'}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Donation Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium mb-1">
              Amount <span className="text-app-accent">*</span>
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount ?? ''}
              onChange={handleChange}
              required
              min="0.01"
              step="0.01"
              className={donationFieldClassName}
            />
          </div>

          <div>
            <label htmlFor="currency" className="block text-sm font-medium mb-1">Currency</label>
            <input
              type="text"
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              maxLength={3}
              className={donationFieldClassName}
              placeholder="CAD"
            />
          </div>

          <div>
            <label htmlFor="donation_date" className="block text-sm font-medium mb-1">
              Donation Date <span className="text-app-accent">*</span>
            </label>
            <input
              type="datetime-local"
              id="donation_date"
              name="donation_date"
              value={formData.donation_date}
              onChange={handleChange}
              required
              className={donationFieldClassName}
            />
          </div>

          <div>
            <label htmlFor="payment_method" className="block text-sm font-medium mb-1">Payment Method</label>
            <select
              id="payment_method"
              name="payment_method"
              value={formData.payment_method}
              onChange={handleChange}
              className={donationFieldClassName}
            >
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="credit_card">Credit Card</option>
              <option value="debit_card">Debit Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="paypal">PayPal</option>
              <option value="stock">Stock</option>
              <option value="in_kind">In-Kind</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="payment_status" className="block text-sm font-medium mb-1">Payment Status</label>
            <select
              id="payment_status"
              name="payment_status"
              value={formData.payment_status}
              onChange={handleChange}
              className={donationFieldClassName}
            >
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label htmlFor="transaction_id" className="block text-sm font-medium mb-1">Transaction ID</label>
            <input
              type="text"
              id="transaction_id"
              name="transaction_id"
              value={formData.transaction_id || ''}
              onChange={handleChange}
              className={donationFieldClassName}
              placeholder="TXN-12345"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Campaign & Designation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="campaign_name" className="block text-sm font-medium mb-1">Campaign Name</label>
            <input
              type="text"
              id="campaign_name"
              name="campaign_name"
              value={formData.campaign_name || ''}
              onChange={handleChange}
              className={donationFieldClassName}
              placeholder="Annual Fund 2026"
            />
          </div>

          <div>
            <label htmlFor="designation" className="block text-sm font-medium mb-1">Designation</label>
            <input
              type="text"
              id="designation"
              name="designation"
              value={formData.designation || ''}
              onChange={handleChange}
              className={donationFieldClassName}
              placeholder="General Operating Fund"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Recurring Donation</h3>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_recurring"
              id="is_recurring"
              checked={formData.is_recurring}
              onChange={handleChange}
              className={checkboxClassName}
            />
            <label htmlFor="is_recurring" className="ml-2 text-sm font-medium text-app-text-muted">
              This is a recurring donation
            </label>
          </div>

          {formData.is_recurring && (
            <div className="max-w-md">
              <label htmlFor="recurring_frequency" className="block text-sm font-medium mb-1">Frequency</label>
              <select
                id="recurring_frequency"
                name="recurring_frequency"
                value={formData.recurring_frequency}
                onChange={handleChange}
                className={donationFieldClassName}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
        <div>
          <label htmlFor="notes" className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes || ''}
            onChange={handleChange}
            rows={4}
            className={`${donationFieldClassName} min-h-[120px]`}
            placeholder="Any additional notes about this donation..."
          />
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t">
        <button
          type="button"
          onClick={() => navigate('/donations')}
          className={secondaryButtonClassName}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={primaryButtonClassName}
          disabled={loading}
        >
          {loading ? 'Saving...' : isEdit ? 'Update Donation' : 'Record Donation'}
        </button>
      </div>
    </form>
  );
};

export default DonationForm;
