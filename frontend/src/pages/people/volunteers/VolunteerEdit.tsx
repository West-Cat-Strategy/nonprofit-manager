import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchVolunteerById, clearCurrentVolunteer } from '../../../store/slices/volunteersSlice';
import { VolunteerForm } from '../../../components/VolunteerForm';

export const VolunteerEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentVolunteer, loading, error } = useAppSelector((state) => state.volunteers);

  useEffect(() => {
    if (id) {
      dispatch(fetchVolunteerById(id));
    }

    return () => {
      dispatch(clearCurrentVolunteer());
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
          Error loading volunteer: {error}
        </div>
        <button
          onClick={() => navigate('/volunteers')}
          className="mt-4 text-app-accent hover:text-app-accent-text"
        >
          ← Back to Volunteers
        </button>
      </div>
    );
  }

  if (!currentVolunteer) {
    return (
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          Volunteer not found
        </div>
        <button
          onClick={() => navigate('/volunteers')}
          className="mt-4 text-app-accent hover:text-app-accent-text"
        >
          ← Back to Volunteers
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-app-text">Edit Volunteer</h1>
        <p className="mt-1 text-sm text-app-text-muted">Update volunteer information and preferences.</p>
      </div>
      <VolunteerForm volunteer={currentVolunteer} mode="edit" />
    </div>
  );
};
