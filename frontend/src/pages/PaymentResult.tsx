/**
 * Payment Result Page
 * Handles redirect results from Stripe (e.g., after 3D Secure authentication)
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import { getPaymentIntent, setPaymentSuccess } from '../store/slices/paymentsSlice';

type ResultStatus = 'loading' | 'success' | 'processing' | 'failed';

const PaymentResult: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<ResultStatus>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const paymentIntentId = searchParams.get('payment_intent');
    const redirectStatus = searchParams.get('redirect_status');

    if (!paymentIntentId) {
      setStatus('failed');
      setMessage('Invalid payment result. No payment information found.');
      return;
    }

    // Check the redirect status from Stripe
    if (redirectStatus === 'succeeded') {
      setStatus('success');
      setMessage('Your payment was successful!');
      dispatch(setPaymentSuccess(true));
    } else if (redirectStatus === 'processing') {
      setStatus('processing');
      setMessage('Your payment is being processed. You will receive a confirmation email shortly.');
    } else if (redirectStatus === 'failed') {
      setStatus('failed');
      setMessage('Your payment was not successful. Please try again.');
    } else {
      // If no redirect_status, fetch the payment intent to check status
      dispatch(getPaymentIntent(paymentIntentId))
        .unwrap()
        .then((intent) => {
          if (intent.status === 'succeeded') {
            setStatus('success');
            setMessage('Your payment was successful!');
            dispatch(setPaymentSuccess(true));
          } else if (intent.status === 'processing') {
            setStatus('processing');
            setMessage('Your payment is being processed.');
          } else {
            setStatus('failed');
            setMessage('Your payment could not be completed. Please try again.');
          }
        })
        .catch(() => {
          setStatus('failed');
          setMessage('Unable to verify payment status. Please contact support.');
        });
    }
  }, [searchParams, dispatch]);

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent" />
        );
      case 'success':
        return (
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
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
        );
      case 'processing':
        return (
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg
              className="h-8 w-8 text-yellow-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        );
      case 'failed':
        return (
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="h-8 w-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        );
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Verifying Payment...';
      case 'success':
        return 'Thank You!';
      case 'processing':
        return 'Payment Processing';
      case 'failed':
        return 'Payment Failed';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
        <div className="flex justify-center mb-6">{getStatusIcon()}</div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">{getTitle()}</h1>

        <p className="text-gray-600 mb-6">{message}</p>

        {status !== 'loading' && (
          <div className="flex gap-4 justify-center">
            {status === 'failed' && (
              <button
                onClick={() => navigate('/donations/payment')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            )}
            <button
              onClick={() => navigate('/donations')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              View Donations
            </button>
            {status === 'success' && (
              <button
                onClick={() => navigate('/donations/payment')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Donate Again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentResult;
