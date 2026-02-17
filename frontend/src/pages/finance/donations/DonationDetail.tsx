/**
 * DonationDetail Component
 * Displays detailed donation information
 */

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchDonationById,
  markReceiptSent,
  clearSelectedDonation,
} from '../../../store/slices/donationsSlice';
import { formatDateTime, formatCurrency } from '../../../utils/format';

const DonationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selectedDonation: donation, loading } = useAppSelector((state) => state.donations);

  useEffect(() => {
    if (id) {
      dispatch(fetchDonationById(id));
    }

    return () => {
      dispatch(clearSelectedDonation());
    };
  }, [id, dispatch]);

  const handleSendReceipt = async () => {
    if (id && confirm('Mark receipt as sent?')) {
      await dispatch(markReceiptSent(id));
    }
  };

  if (loading || !donation) {
    return <div className="p-6 text-center">Loading donation details...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">{donation.donation_number}</h1>
          <div className="flex gap-2">
            <span
              className={`px-3 py-1 text-sm font-semibold rounded-full ${
                donation.payment_status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : donation.payment_status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
              }`}
            >
              {donation.payment_status}
            </span>
            {donation.is_recurring && (
              <span className="px-3 py-1 text-sm font-semibold rounded-full bg-app-accent-soft text-app-accent-text">
                Recurring
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!donation.receipt_sent && (
            <button
              onClick={handleSendReceipt}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Send Receipt
            </button>
          )}
          <button
            onClick={() => navigate(`/donations/${id}/edit`)}
            className="px-4 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover"
          >
            Edit
          </button>
          <button
            onClick={() => navigate('/donations')}
            className="px-4 py-2 border rounded-md hover:bg-app-surface-muted"
          >
            Back
          </button>
        </div>
      </div>

      <div className="bg-app-surface shadow-md rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Donation Information</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-app-text-muted">Amount</dt>
                <dd className="text-2xl font-bold text-green-600">
                  {formatCurrency(donation.amount, donation.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-app-text-muted">Donation Date</dt>
                <dd className="text-sm text-app-text">{formatDateTime(donation.donation_date)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-app-text-muted">Payment Method</dt>
                <dd className="text-sm text-app-text">
                  {donation.payment_method
                    ?.replace('_', ' ')
                    .replace(/\b\w/g, (l) => l.toUpperCase()) || 'N/A'}
                </dd>
              </div>
              {donation.transaction_id && (
                <div>
                  <dt className="text-sm font-medium text-app-text-muted">Transaction ID</dt>
                  <dd className="text-sm text-app-text font-mono">{donation.transaction_id}</dd>
                </div>
              )}
            </dl>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Donor Information</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-app-text-muted">Donor</dt>
                <dd className="text-sm text-app-text">
                  {donation.account_name || donation.contact_name || 'Anonymous'}
                </dd>
              </div>
              {donation.campaign_name && (
                <div>
                  <dt className="text-sm font-medium text-app-text-muted">Campaign</dt>
                  <dd className="text-sm text-app-text">{donation.campaign_name}</dd>
                </div>
              )}
              {donation.designation && (
                <div>
                  <dt className="text-sm font-medium text-app-text-muted">Designation</dt>
                  <dd className="text-sm text-app-text">{donation.designation}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {donation.is_recurring && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Recurring Donation</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-app-text-muted">Frequency</dt>
                <dd className="text-sm text-app-text capitalize">
                  {donation.recurring_frequency?.replace('_', ' ')}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {donation.notes && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-2">Notes</h3>
            <p className="text-app-text-muted whitespace-pre-wrap">{donation.notes}</p>
          </div>
        )}

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Receipt Information</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-app-text-muted">Receipt Status</dt>
              <dd className="text-sm">
                {donation.receipt_sent ? (
                  <span className="text-green-600 font-semibold">✓ Sent</span>
                ) : (
                  <span className="text-yellow-600">Not Sent</span>
                )}
              </dd>
            </div>
            {donation.receipt_sent_date && (
              <div>
                <dt className="text-sm font-medium text-app-text-muted">Receipt Sent Date</dt>
                <dd className="text-sm text-app-text">
                  {formatDateTime(donation.receipt_sent_date)}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-2">Metadata</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-app-text-muted">
            <div>
              <span className="font-medium">Created:</span>{' '}
              {new Date(donation.created_at).toLocaleDateString()}
            </div>
            <div>
              <span className="font-medium">Last Updated:</span>{' '}
              {new Date(donation.updated_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonationDetail;
