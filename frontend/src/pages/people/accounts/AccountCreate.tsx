import React from 'react';
import { AccountForm } from '../../../components/AccountForm';

export const AccountCreate: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-app-text">Create New Account</h1>
        <p className="mt-1 text-sm text-app-text-muted">
          Add a new account to the system. Required fields are marked with an asterisk (*).
        </p>
      </div>
      <AccountForm mode="create" />
    </div>
  );
};
