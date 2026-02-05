/**
 * CaseCreate Page
 * Page for creating a new case with neo-brutalist styling
 */

import { useNavigate } from 'react-router-dom';
import { BrutalCard } from '../../../components/neo-brutalist';
import CaseForm from '../../../components/CaseForm';

const CaseCreate = () => {
  const navigate = useNavigate();

  return (
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

      {/* Form */}
      <BrutalCard color="white" className="p-6">
        <CaseForm />
      </BrutalCard>
    </div>
  );
};

export default CaseCreate;
