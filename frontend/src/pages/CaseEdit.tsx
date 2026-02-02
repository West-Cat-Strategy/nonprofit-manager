import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchCaseById, clearCurrentCase } from '../store/slices/casesSlice';
import CaseForm from '../components/CaseForm';
import type { CreateCaseDTO } from '../types/case';

const CaseEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentCase, loading, error } = useAppSelector((state) => state.cases);

  // Convert CaseWithDetails to CreateCaseDTO format
  const initialData = useMemo<Partial<CreateCaseDTO> | undefined>(() => {
    if (!currentCase) return undefined;
    return {
      contact_id: currentCase.contact_id,
      account_id: currentCase.account_id || undefined,
      case_type_id: currentCase.case_type_id,
      title: currentCase.title,
      description: currentCase.description || undefined,
      priority: currentCase.priority,
      source: currentCase.source || undefined,
      referral_source: currentCase.referral_source || undefined,
      assigned_to: currentCase.assigned_to || undefined,
      assigned_team: currentCase.assigned_team || undefined,
      due_date: currentCase.due_date || undefined,
      is_urgent: currentCase.is_urgent,
      tags: currentCase.tags || undefined,
    };
  }, [currentCase]);

  useEffect(() => {
    if (id) {
      dispatch(fetchCaseById(id));
    }

    return () => {
      dispatch(clearCurrentCase());
    };
  }, [dispatch, id]);

  if (loading && !currentCase) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      </div>
    );
  }

  if (!currentCase) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-600">Case not found</p>
          <button
            onClick={() => navigate('/cases')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Cases
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Edit Case</h1>
          <p className="text-gray-600 mt-1">
            {currentCase.case_number} - {currentCase.title}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <CaseForm
            caseId={id}
            initialData={initialData}
            onSuccess={() => navigate(`/cases/${id}`)}
          />
        </div>
      </div>
    </div>
  );
};

export default CaseEdit;
