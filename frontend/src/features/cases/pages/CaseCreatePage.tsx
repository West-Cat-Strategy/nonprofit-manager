/**
 * CaseCreate Page
 * Page for creating a new case with neo-brutalist styling
 */

import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BrutalCard, NeoBrutalistLayout } from '../../../components/neo-brutalist';
import CaseForm from '../../../components/CaseForm';
import type { CreateCaseDTO } from '../../../types/case';

const CaseCreate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialData = useMemo<Partial<CreateCaseDTO>>(() => {
    const isUrgent = searchParams.get('is_urgent');
    return {
      contact_id: searchParams.get('contact_id') || undefined,
      case_type_id: searchParams.get('case_type_id') || undefined,
      title: searchParams.get('title') || undefined,
      description: searchParams.get('description') || undefined,
      priority: (searchParams.get('priority') as CreateCaseDTO['priority']) || undefined,
      source: (searchParams.get('source') as CreateCaseDTO['source']) || undefined,
      is_urgent: isUrgent === 'true' ? true : undefined,
    };
  }, [searchParams]);

  const hasPrefillContext = Boolean(initialData.contact_id || initialData.case_type_id || initialData.title);

  return (
    <NeoBrutalistLayout pageTitle="Create Case">
      <div className="p-6 space-y-6">
        {/* Header */}
        <BrutalCard color="green" className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <button
                onClick={() => navigate('/cases')}
                className="text-sm font-black uppercase text-black/70 hover:text-black mb-2 flex items-center gap-1"
                aria-label="Back to cases"
              >
                ← Back to Cases
              </button>
              <h1 className="text-3xl font-black uppercase tracking-tight text-black">
                Create New Case
              </h1>
              <p className="mt-1 font-bold text-black/70">
                Open a new case for a client
              </p>
            </div>
          </div>
        </BrutalCard>

        {hasPrefillContext && (
          <BrutalCard color="yellow" className="p-4">
            <p className="text-sm font-black uppercase text-black">
              Prefilled context applied from your workflow link.
            </p>
          </BrutalCard>
        )}

        {/* Form */}
        <BrutalCard color="white" className="p-6">
          <CaseForm initialData={initialData} />
        </BrutalCard>
      </div>
    </NeoBrutalistLayout>
  );
};

export default CaseCreate;
