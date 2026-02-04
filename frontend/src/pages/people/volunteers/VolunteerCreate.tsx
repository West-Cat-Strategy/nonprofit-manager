import React from 'react';
import { VolunteerForm } from '../../../components/VolunteerForm';

export const VolunteerCreate: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Volunteer</h1>
        <p className="mt-1 text-sm text-gray-600">
          Register a new volunteer. You must first create a contact before creating a volunteer
          record.
        </p>
      </div>
      <VolunteerForm mode="create" />
    </div>
  );
};
