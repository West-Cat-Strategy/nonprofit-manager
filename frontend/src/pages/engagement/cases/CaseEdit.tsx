/**
 * CaseEdit Page
 * Page for editing an existing case with neo-brutalist styling
 */

import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchCaseById, clearCurrentCase } from '../../../store/slices/casesSlice';
import { BrutalButton, BrutalCard, NeoBrutalistLayout } from '../../../components/neo-brutalist';
import CaseForm from '../../../components/CaseForm';
import type { CreateCaseDTO } from '../../../types/case';

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
      <NeoBrutalistLayout pageTitle="Edit Case">
        <div className="p-6">
          <BrutalCard color="white" className="p-12">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin h-12 w-12 border-4 border-black border-t-transparent mb-4" />
              <p className="font-bold text-black">Loading case...</p>
            </div>
          </BrutalCard>
        </div>
      </NeoBrutalistLayout>
    );
  }

  if (error) {
    return (
      <NeoBrutalistLayout pageTitle="Edit Case">
        <div className="p-6">
          <BrutalCard color="pink" className="p-6">
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h2 className="text-xl font-black uppercase text-black mb-2">Error</h2>
              <p className="font-bold text-black/70 mb-4">{error}</p>
              <BrutalButton onClick={() => navigate('/cases')} variant="secondary">
                Back to Cases
              </BrutalButton>
            </div>
          </BrutalCard>
        </div>
      </NeoBrutalistLayout>
    );
  }

  if (!currentCase) {
    return (
      <NeoBrutalistLayout pageTitle="Edit Case">
        <div className="p-6">
          <BrutalCard color="yellow" className="p-6">
            <div className="text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h2 className="text-xl font-black uppercase text-black mb-2">Case Not Found</h2>
              <p className="font-bold text-black/70 mb-4">
                The case you're looking for doesn't exist or has been removed.
              </p>
              <BrutalButton onClick={() => navigate('/cases')} variant="primary">
                Back to Cases
              </BrutalButton>
            </div>
          </BrutalCard>
        </div>
      </NeoBrutalistLayout>
    );
  }

  return (
    <NeoBrutalistLayout pageTitle="Edit Case">
      <div className="p-6 space-y-6">
        {/* Header */}
        <BrutalCard color="purple" className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <button
                onClick={() => navigate(`/cases/${id}`)}
                className="text-sm font-black uppercase text-black/70 hover:text-black mb-2 flex items-center gap-1"
                aria-label="Back to case details"
              >
                ← Back to Case
              </button>
              <h1 className="text-3xl font-black uppercase tracking-tight text-black">
                Edit Case
              </h1>
              <p className="mt-1 font-bold text-black/70">
                {currentCase.case_number} - {currentCase.title}
              </p>
            </div>
            <div className="flex gap-2">
              <BrutalButton onClick={() => navigate(`/cases/${id}`)} variant="secondary">
                Cancel
              </BrutalButton>
            </div>
          </div>
        </BrutalCard>

        {/* Form */}
        <BrutalCard color="white" className="p-6">
          <CaseForm
            caseId={id}
            initialData={initialData}
            onSuccess={() => navigate(`/cases/${id}`)}
          />
        </BrutalCard>
      </div>
    </NeoBrutalistLayout>
  );
};

export default CaseEdit;
