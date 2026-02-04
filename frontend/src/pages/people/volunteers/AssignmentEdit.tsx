import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchVolunteerAssignments } from '../../../store/slices/volunteersSlice';
import { AssignmentForm } from '../../../components/AssignmentForm';

export const AssignmentEdit: React.FC = () => {
  const { volunteerId, assignmentId } = useParams<{ volunteerId: string; assignmentId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { assignments, loading, error } = useAppSelector((state) => state.volunteers);

  useEffect(() => {
    if (volunteerId) {
      dispatch(fetchVolunteerAssignments(volunteerId));
    }
  }, [volunteerId, dispatch]);

  if (!volunteerId || !assignmentId) {
    return (
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Volunteer ID and Assignment ID are required.
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error loading assignment: {error}
        </div>
        <button
          onClick={() => navigate(`/volunteers/${volunteerId}`)}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          ← Back to Volunteer
        </button>
      </div>
    );
  }

  const assignment = assignments.find((a) => a.assignment_id === assignmentId);

  if (!assignment) {
    return (
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          Assignment not found
        </div>
        <button
          onClick={() => navigate(`/volunteers/${volunteerId}`)}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          ← Back to Volunteer
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
        <h1 className="text-2xl font-bold text-gray-900">Edit Assignment</h1>
        <p className="mt-1 text-sm text-gray-600">Update assignment details and track hours.</p>
      </div>
      <AssignmentForm assignment={assignment} volunteerId={volunteerId} mode="edit" />
    </div>
  );
};
