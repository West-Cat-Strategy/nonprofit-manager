import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchAccountById, clearCurrentAccount } from '../../../store/slices/accountsSlice';
import { AccountForm } from '../../../components/AccountForm';

export const AccountEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentAccount, loading, error } = useAppSelector((state) => state.accounts);

  useEffect(() => {
    if (id) {
      dispatch(fetchAccountById(id));
    }

    return () => {
      dispatch(clearCurrentAccount());
    };
  }, [id, dispatch]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-app-accent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error loading account: {error}
        </div>
        <button
          onClick={() => navigate('/accounts')}
          className="mt-4 text-app-accent hover:text-app-accent-text"
        >
          ← Back to Accounts
        </button>
      </div>
    );
  }

  if (!currentAccount) {
    return (
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          Account not found
        </div>
        <button
          onClick={() => navigate('/accounts')}
          className="mt-4 text-app-accent hover:text-app-accent-text"
        >
          ← Back to Accounts
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-app-text">Edit Account</h1>
        <p className="mt-1 text-sm text-app-text-muted">
          Update account information. Required fields are marked with an asterisk (*).
        </p>
      </div>
      <AccountForm account={currentAccount} mode="edit" />
    </div>
  );
};
