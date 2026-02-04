/**
 * Donation Payment Page
 * Complete donation workflow with Stripe payment
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchPaymentConfig,
  createPaymentIntent,
  clearPaymentError,
  clearCurrentIntent,
  setPaymentSuccess,
} from '../../../store/slices/paymentsSlice';
import { createDonation } from '../../../store/slices/donationsSlice';
import api from '../../../services/api';
import PaymentForm from '../../../components/PaymentForm';
import type { DonationPaymentData } from '../../../types/payment';
import type { CreateDonationDTO } from '../../../types/donation';

// Preset donation amounts
const PRESET_AMOUNTS = [25, 50, 100, 250, 500, 1000];

const DonationPayment: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();

  const { config, currentIntent, isProcessing, error, paymentSuccess } = useAppSelector(
    (state) => state.payments
  );

  // Form state
  const [step, setStep] = useState<'amount' | 'details' | 'payment' | 'success'>('amount');
  const [formData, setFormData] = useState<DonationPaymentData>({
    amount: 0,
    currency: 'usd',
    donorEmail: '',
    donorName: '',
    donorPhone: '',
    isRecurring: false,
    campaignName: searchParams.get('campaign') || '',
    designation: '',
    isAnonymous: false,
    notes: '',
  });
  const [customAmount, setCustomAmount] = useState('');
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [donationRecordError, setDonationRecordError] = useState<string | null>(null);

  // Fetch payment config on mount
  useEffect(() => {
    dispatch(fetchPaymentConfig());
    return () => {
      dispatch(clearCurrentIntent());
      dispatch(clearPaymentError());
    };
  }, [dispatch]);

  // Initialize Stripe when config is loaded
  useEffect(() => {
    if (config?.stripe.configured && config.stripe.publishableKey) {
      setStripePromise(loadStripe(config.stripe.publishableKey));
    }
  }, [config]);

  // Handle successful payment
  useEffect(() => {
    if (paymentSuccess) {
      setStep('success');
    }
  }, [paymentSuccess]);

  const handleAmountSelect = (amount: number) => {
    setFormData((prev) => ({ ...prev, amount: amount * 100 })); // Convert to cents
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomAmount(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setFormData((prev) => ({ ...prev, amount: Math.round(numValue * 100) }));
    } else {
      setFormData((prev) => ({ ...prev, amount: 0 }));
    }
  };

  const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleContinueToDetails = () => {
    if (formData.amount >= 100) {
      // Minimum $1 (100 cents)
      setStep('details');
    }
  };

  const handleContinueToPayment = async () => {
    if (!formData.donorEmail) return;

    try {
      await dispatch(
        createPaymentIntent({
          amount: formData.amount,
          currency: formData.currency,
          description: `Donation${formData.campaignName ? ` - ${formData.campaignName}` : ''}`,
          receiptEmail: formData.donorEmail,
          metadata: {
            donorName: formData.donorName || 'Anonymous',
            campaignName: formData.campaignName || '',
            designation: formData.designation || '',
            isAnonymous: formData.isAnonymous.toString(),
          },
        })
      ).unwrap();
      setStep('payment');
    } catch {
      // Error is handled by Redux
    }
  };

  const parseDonorName = (name: string | undefined) => {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      return { first_name: 'Anonymous', last_name: 'Donor' };
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
      return { first_name: parts[0], last_name: 'Donor' };
    }
    return {
      first_name: parts.slice(0, -1).join(' '),
      last_name: parts[parts.length - 1],
    };
  };

  const ensureContactId = async () => {
    if (!formData.donorEmail) return null;
    const searchResponse = await api.get('/contacts', {
      params: { search: formData.donorEmail, limit: 1, is_active: true },
    });
    const contacts = searchResponse.data?.data || searchResponse.data?.contacts || [];
    const match = contacts.find((contact: any) =>
      (contact.email || '').toLowerCase() === formData.donorEmail.toLowerCase()
    );
    if (match?.contact_id) {
      return match.contact_id as string;
    }

    const { first_name, last_name } = parseDonorName(formData.donorName);
    const createResponse = await api.post('/contacts', {
      first_name,
      last_name,
      email: formData.donorEmail,
      phone: formData.donorPhone || undefined,
    });
    return createResponse.data?.contact_id || null;
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      setDonationRecordError(null);
      const contactId = await ensureContactId();
      if (!contactId) {
        throw new Error('Unable to create or locate donor contact');
      }

      const donationData: CreateDonationDTO = {
        contact_id: contactId,
        amount: formData.amount / 100,
        currency: formData.currency.toUpperCase(),
        donation_date: new Date().toISOString(),
        payment_method: 'credit_card',
        payment_status: 'completed',
        transaction_id: paymentIntentId,
        campaign_name: formData.campaignName || undefined,
        designation: formData.designation || undefined,
        is_recurring: formData.isRecurring,
        recurring_frequency: formData.isRecurring
          ? formData.recurringFrequency === 'yearly'
            ? 'annually'
            : formData.recurringFrequency || 'monthly'
          : 'one_time',
        notes: formData.notes || undefined,
      };

      await dispatch(createDonation(donationData)).unwrap();
      dispatch(setPaymentSuccess(true));
    } catch (err) {
      console.error('Failed to create donation record:', err);
      setDonationRecordError(
        'Your payment was successful, but we could not save your donation record. Please contact support with your receipt details.'
      );
      dispatch(setPaymentSuccess(true));
    }
  };

  const handlePaymentError = (errorMessage: string) => {
    console.error('Payment error:', errorMessage);
  };

  const handleBack = () => {
    if (step === 'details') setStep('amount');
    else if (step === 'payment') setStep('details');
  };

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: formData.currency.toUpperCase(),
    }).format(cents / 100);
  };

  // Check if Stripe is configured
  if (!config?.stripe.configured) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-yellow-500 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Payment System Not Configured
          </h2>
          <p className="text-gray-600 mb-4">
            Online donations are temporarily unavailable. Please contact us for other ways to donate.
          </p>
          <button
            onClick={() => navigate('/donations')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Donations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Make a Donation</h1>
          <p className="text-gray-600">Your support makes a difference</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {['amount', 'details', 'payment', 'success'].map((s, index) => (
            <React.Fragment key={s}>
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step === s
                    ? 'bg-blue-600 text-white'
                    : ['amount', 'details', 'payment', 'success'].indexOf(step) > index
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {['amount', 'details', 'payment', 'success'].indexOf(step) > index ? (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              {index < 3 && (
                <div
                  className={`w-16 h-1 ${
                    ['amount', 'details', 'payment', 'success'].indexOf(step) > index
                      ? 'bg-green-500'
                      : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Step 1: Amount Selection */}
        {step === 'amount' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Select Amount</h2>

            {/* Preset Amounts */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {PRESET_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleAmountSelect(amount)}
                  className={`py-3 px-4 rounded-lg border-2 font-semibold transition-colors ${
                    formData.amount === amount * 100
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  ${amount}
                </button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or enter a custom amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Recurring Option */}
            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isRecurring"
                  checked={formData.isRecurring}
                  onChange={handleDetailsChange}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">Make this a monthly donation</span>
              </label>
            </div>

            {/* Continue Button */}
            <button
              onClick={handleContinueToDetails}
              disabled={formData.amount < 100}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              Continue with {formData.amount > 0 ? formatCurrency(formData.amount) : '$0.00'}
            </button>
          </div>
        )}

        {/* Step 2: Donor Details */}
        {step === 'details' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="donorEmail"
                  value={formData.donorEmail}
                  onChange={handleDetailsChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  name="donorName"
                  value={formData.donorName}
                  onChange={handleDetailsChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Designation (Optional)
                </label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleDetailsChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., General Fund, Education, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleDetailsChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any special instructions or messages..."
                />
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isAnonymous"
                    checked={formData.isAnonymous}
                    onChange={handleDetailsChange}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Make this donation anonymous</span>
                </label>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-4 mt-6">
              <button
                onClick={handleBack}
                className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleContinueToPayment}
                disabled={!formData.donorEmail || isProcessing}
                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {isProcessing ? 'Processing...' : 'Continue to Payment'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {step === 'payment' && currentIntent && stripePromise && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-xl font-semibold text-gray-900">Payment Details</h2>
            </div>

            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: currentIntent.clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#2563eb',
                  },
                },
              }}
            >
              <PaymentForm
                amount={formData.amount}
                currency={formData.currency}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onCancel={handleBack}
                submitButtonText={`Donate ${formatCurrency(formData.amount)}`}
              />
            </Elements>
          </div>
        )}

	        {/* Step 4: Success */}
	        {step === 'success' && (
	          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="h-8 w-8 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
	            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
	            <p className="text-gray-600 mb-6">
	              Your donation of {formatCurrency(formData.amount)} has been processed successfully.
	              A receipt has been sent to {formData.donorEmail}.
	            </p>
	            {donationRecordError && (
	              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6 text-left">
	                {donationRecordError}
	              </div>
	            )}
	            <div className="flex gap-4 justify-center">
	              <button
	                onClick={() => navigate('/donations')}
	                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                View Donations
              </button>
              <button
                onClick={() => {
                  dispatch(clearCurrentIntent());
                  setFormData({
                    amount: 0,
                    currency: 'usd',
                    donorEmail: '',
                    donorName: '',
                    donorPhone: '',
                    isRecurring: false,
                    campaignName: '',
                    designation: '',
                    isAnonymous: false,
                    notes: '',
                  });
                  setStep('amount');
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Make Another Donation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DonationPayment;
