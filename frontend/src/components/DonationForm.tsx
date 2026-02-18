/**
 * DonationForm Component
 * Reusable form for creating and editing donations
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Donation, CreateDonationDTO, UpdateDonationDTO } from '../types/donation';

interface DonationFormProps {
  donation?: Donation | null;
  onSubmit: (donationData: CreateDonationDTO | UpdateDonationDTO) => Promise<void>;
  isEdit?: boolean;
}

const DonationForm: React.FC<DonationFormProps> = ({ donation, onSubmit, isEdit = false }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateDonationDTO | UpdateDonationDTO>({
    amount: 0,
    currency: 'USD',
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
        donation_date: donation.donation_date.substring(0, 16),
        payment_method: donation.payment_method || undefined,
        payment_status: donation.payment_status,
        transaction_id: donation.transaction_id || undefined,
        campaign_name: donation.campaign_name || undefined,
        designation: donation.designation || undefined,
        is_recurring: donation.is_recurring,
        recurring_frequency: donation.recurring_frequency || undefined,
        notes: donation.notes || undefined,
      });
    }
  }, [donation]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

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

      await onSubmit(formData);
      navigate('/donations');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save donation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-app-surface shadow-md rounded-lg p-6">
      {error && <div className="p-4 bg-red-100 text-red-700 rounded-md">{error}</div>}

      <div>
        <h3 className="text-lg font-semibold mb-4">Donation Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium mb-1">
              Amount <span className="text-red-500">*</span>
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
              className="w-full px-4 py-2 border rounded-md"
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
              className="w-full px-4 py-2 border rounded-md"
              placeholder="USD"
            />
          </div>

          <div>
            <label htmlFor="donation_date" className="block text-sm font-medium mb-1">
              Donation Date <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              id="donation_date"
              name="donation_date"
              value={formData.donation_date}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-md"
            />
          </div>

          <div>
            <label htmlFor="payment_method" className="block text-sm font-medium mb-1">Payment Method</label>
            <select
              id="payment_method"
              name="payment_method"
              value={formData.payment_method}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md"
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
              className="w-full px-4 py-2 border rounded-md"
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
              className="w-full px-4 py-2 border rounded-md"
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
              className="w-full px-4 py-2 border rounded-md"
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
              className="w-full px-4 py-2 border rounded-md"
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
              className="h-4 w-4 text-app-accent border-app-input-border rounded"
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
                className="w-full px-4 py-2 border rounded-md"
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
            className="w-full px-4 py-2 border rounded-md"
            placeholder="Any additional notes about this donation..."
          />
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t">
        <button
          type="button"
          onClick={() => navigate('/donations')}
          className="px-6 py-2 border rounded-md hover:bg-app-surface-muted"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Saving...' : isEdit ? 'Update Donation' : 'Record Donation'}
        </button>
      </div>
    </form>
  );
};

export default DonationForm;
