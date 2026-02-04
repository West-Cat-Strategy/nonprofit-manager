import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AssignmentForm } from '../../../components/AssignmentForm';

export const AssignmentCreate: React.FC = () => {
  const { volunteerId } = useParams<{ volunteerId: string }>();
  const navigate = useNavigate();

  if (!volunteerId) {
    return (
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Volunteer ID is required to create an assignment.
        </div>
        <button
          onClick={() => navigate('/volunteers')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          ← Back to Volunteers
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/volunteers/${volunteerId}`)}
          className="text-blue-600 hover:text-blue-800 mb-2"
        >
          ← Back to Volunteer
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create Assignment</h1>
        <p className="mt-1 text-sm text-gray-600">
          Create a new assignment for this volunteer. Required fields are marked with an asterisk
          (*).
        </p>
      </div>
      <AssignmentForm volunteerId={volunteerId} mode="create" />
    </div>
  );
};
